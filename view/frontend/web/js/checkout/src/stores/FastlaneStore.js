import { defineStore } from 'pinia';

import debounce from 'lodash.debounce';

import getAllowedBrands from '../helpers/getAllowedBrands';
import getAllowedLocations from '../helpers/getAllowedLocations';
import mapAddress from '../helpers/mapAddress';
import mapAddressToFastlane from '../helpers/mapAddressToFastlane';

export default defineStore('fastlaneStore', {
  state: () => ({
    cache: {},
    config: {
      paypal_fastlane_is_active: false,
    },
    clientInstance: null,
    threeDSecureInstance: null,
    customerContextId: null,
    dataCollectorInstance: null,
    fastlaneInstance: null,
    fastlanePaymentComponent: null,
    fastlaneWatermark: null,
    profileData: null,
    email: null,
    isLookingUpUser: false,
    profileEmail: null,
  }),
  getters: {},
  actions: {
    setData(data) {
      this.$patch(data);
    },

    buildJsPromises() {
      const files = [
        'https://js.braintreegateway.com/web/3.104.0/js/client.min.js',
        'https://js.braintreegateway.com/web/3.104.0/js/data-collector.min.js',
        'https://js.braintreegateway.com/web/3.104.0/js/three-d-secure.min.js',
        'https://js.braintreegateway.com/web/3.104.0/js/fastlane.min.js',
      ];
      const promises = [];

      files.forEach((file) => {
        const promise = new Promise((resolve) => {
          const braintreeScript = document.createElement('script');
          braintreeScript.setAttribute('src', file);
          braintreeScript.onload = resolve;
          document.head.appendChild(braintreeScript);
        });
        promises.push(promise);
      });

      return Promise.all(promises);
    },

    addRequiredJs() {
      return this.getCachedResponse(this.buildJsPromises, 'addRequiredJs');
    },

    async setup() {
      const { default: { stores: { useCustomerStore } } } = await import(window.bluefinchCheckout.main);
      const customerStore = useCustomerStore();

      if (!customerStore.isLoggedIn) {
        return this.getCachedResponse(async () => {
          await this.getConfiguration();

          // Early return if Fastlane is not active.
          if (!this.$state.config.paypal_fastlane_is_active) {
            return;
          }

          await this.addRequiredJs();
          window.localStorage.setItem('axoEnv', 'sandbox');

          const {
            default: { stores: { useBraintreeStore } },
          } = await import(window.bluefinchCheckout.main);
          const braintreeStore = useBraintreeStore();

          await braintreeStore.createClientToken();
          const { clientToken } = braintreeStore;

          const clientInstance = await window.braintree.client.create({
            authorization: clientToken,
          });
          this.setData({ clientInstance });

          const dataCollectorInstance = await window.braintree.dataCollector.create({
            client: clientInstance,
          });
          this.setData({ dataCollectorInstance });

          const fastlaneInstance = await window.braintree.fastlane.create({
            cardOptions: {
              allowedBrands: await getAllowedBrands(),
            },
            shippingAddressOptions: {
              allowedLocations: await getAllowedLocations(),
            },
            authorization: clientToken,
            client: clientInstance,
            deviceData: dataCollectorInstance.deviceData,
            platformOptions: {
              authorization: clientToken,
              client: clientInstance,
              deviceData: dataCollectorInstance.deviceData,
              platform: 'BT',
            },
          });
          this.setData({ fastlaneInstance });

          this.overrideGoToYouDetails();
        }, 'setup');
      }

      return undefined;
    },

    async getConfiguration() {
      const { default: { services: { getStoreConfig } } } = await import(window.bluefinchCheckout.main);

      const configs = [
        'paypal_fastlane_is_active',
        'paypal_fastlane_show_branding',
        'paypal_fastlane_show_cardholder_name',
        'paypal_fastlane_insights_enabled',
        'paypal_fastlane_client_id',
        'paypal_fastlane_policy_active',
      ];

      const config = await getStoreConfig(configs);

      this.setData({ config });
    },

    async attachEmailListener() {
      // Early return if Fastlane is not active.
      if (!this.$state.config.paypal_fastlane_is_active) {
        return;
      }

      const { default: { stores: { useCustomerStore } } } = await import(window.bluefinchCheckout.main);
      const customerStore = useCustomerStore();

      this.$state.email = customerStore.customer.email;

      const debounced = debounce(this.lookupUser, 2000);
      customerStore.$subscribe(async (mutation, payload) => {
        if (mutation.type === 'direct' && typeof payload.customer.email !== 'undefined') {
          if (this.$state.email !== payload.customer.email) {
            debounced(payload.customer.email);
            this.$state.email = payload.customer.email;
          }
        }
      });
    },

    async lookupUser(email) {
      if (!email || this.isLookingUpUser) {
        return;
      }

      this.isLookingUpUser = true;

      const {
        default:
          {
            stores: {
              useLoadingStore,
              useStepsStore,
              useShippingMethodsStore,
              useConfigStore,
              useCustomerStore,
            },
            services: {
              getShippingMethods,
            },
          },
      } = await import(window.bluefinchCheckout.main);
      const loadingStore = useLoadingStore();
      const stepsStore = useStepsStore();
      const shippingMethodsStore = useShippingMethodsStore();
      const configStore = useConfigStore();
      const customerStore = useCustomerStore();

      loadingStore.setLoadingState(true);

      const {
        customerContextId,
      } = await this.$state.fastlaneInstance.identity.lookupCustomerByEmail(email);

      this.setData({
        customerContextId,
        profileData: null,
      });

      // If we have do have an account then trigger the authentication.
      if (customerContextId) {
        document.activeElement.blur();

        const {
          profileData,
        } = await this.$state.fastlaneInstance
          .identity.triggerAuthenticationFlow(customerContextId);

        if (profileData) {
          await customerStore.submitEmail(email);
          // Check to see if the User already has an address.
          if ((!this.$state.profileEmail && profileData.shippingAddress && !customerStore.selected.shipping.postcode)
            || (this.$state.profileEmail && this.$state.profileEmail !== email)) {
            await this.handleShippingAddress(profileData.shippingAddress);

            const address = profileData.shippingAddress;
            let mappedAddress;
            if (address) {
              mappedAddress = {
                id: null,
                street: [
                  address.streetAddress,
                ],
                city: address.locality,
                region: address.region,
                region_id: configStore.getRegionId(address.countryCodeAlpha2, address.region),
                country_code: address.countryCodeAlpha2,
                postcode: address.postalCode,
                company: address.company !== 'undefined' ? address.company : '',
                telephone: address.phoneNumber,
                firstname: address.firstName,
                lastname: address.lastName,
              };

              const result = await getShippingMethods(mappedAddress);
              const methods = result.shipping_addresses[0].available_shipping_methods;

              if (methods.length) {
                await shippingMethodsStore.submitShippingInfo(methods[0].carrier_code, methods[0].method_code);
                stepsStore.goToPayment();
              } else {
                stepsStore.goToShipping();
              }
            }
          }

          await this.setProfileData(profileData, email);
          this.setData({ profileEmail: email });
        }
      }

      this.isLookingUpUser = false;

      loadingStore.setLoadingState(false);
    },

    async setProfileData(profileData, email) {
      // Early return if there is no profile data.
      if (!profileData) {
        return;
      }

      this.setData({
        profileData,
      });

      const { default: { stores: { useCustomerStore } } } = await import(window.bluefinchCheckout.main);
      const customerStore = useCustomerStore();

      if (email) {
        await customerStore.submitEmail(email);
      }
    },

    async handleShippingAddress(shippingAddress) {
      const {
        default: {
          stores: {
            useCustomerStore, useStepsStore, useShippingMethodsStore, useValidationStore,
          },
        },
      } = await import(window.bluefinchCheckout.main);
      const customerStore = useCustomerStore();
      const shippingMethodsStore = useShippingMethodsStore();
      const validationStore = useValidationStore();

      customerStore.setEmailEntered();
      customerStore.setAddressAsCustom('shipping');

      const mappedAddress = await mapAddress(shippingAddress);
      customerStore.setAddressToStore(mappedAddress, 'shipping');
      customerStore.setAddressAsCustom('shipping');

      const isValid = validationStore.validateAddress('shipping', true)
        && validationStore.validateField(
          'shipping',
          'postcode',
          true,
        );

      if (!isValid) {
        customerStore.setAddressAsEditing('shipping', true);

        const stepsStore = useStepsStore();
        stepsStore.goToYouDetails();

        // Early return so we don't process getting shipping methods.
        return;
      }

      shippingMethodsStore.setAddressesOnCart();
    },

    async renderFastlanePaymentComponent(selector) {
      if (this.$state.fastlaneInstance) {
        const {
          default: {
            stores: {
              useCartStore,
              useCustomerStore,
            },
          },
        } = await import(window.bluefinchCheckout.main);

        const cartStore = useCartStore();
        const customerStore = useCustomerStore();

        const fields = {
          phoneNumber: {
            prefill: this.$state.profileData?.shippingAddress?.phoneNumber
              || cartStore.cart?.shipping_addresses[0]?.telephone,
          },
        };

        if (!this.$state.customerContextId) {
          await this.lookupUser(customerStore.customer.email);
        }

        const shippingAddress = cartStore.cart.shipping_addresses[0]
          ? mapAddressToFastlane(cartStore.cart.shipping_addresses[0])
          : {};

        // Add the card holder name field if enabled in config.
        if (this.$state.config.paypal_fastlane_show_cardholder_name) {
          fields.cardholderName = {};
        }

        const fastlanePaymentComponent = await this.$state.fastlaneInstance
          .FastlanePaymentComponent({ fields, shippingAddress });

        fastlanePaymentComponent.render(selector);

        this.setData({ fastlanePaymentComponent });
      }
    },

    async createPayment() {
      const {
        default: {
          stores: {
            useAgreementStore,
            useRecaptchaStore,
          },
        },
      } = await import(window.bluefinchCheckout.main);

      const agreementStore = useAgreementStore();
      const recaptchStore = useRecaptchaStore();

      const agreementsValid = agreementStore.validateAgreements();
      const recaptchaValid = await recaptchStore.validateToken('braintree', 'fastlane');

      if (!this.$state.fastlanePaymentComponent || !agreementsValid || !recaptchaValid) {
        return;
      }

      const {
        id,
        paymentSource: { card: { billingAddress, name } },
      } = await this.$state.fastlanePaymentComponent.getPaymentToken();
      const {
        default: {
          helpers: {
            getSuccessPageUrl,
            handleServiceError,
          },
          services: {
            refreshCustomerData,
          },
          stores: {
            useCustomerStore,
            useLoadingStore,
            usePaymentStore,
            useShippingMethodsStore,
            useValidationStore,
          },
        },
      } = await import(window.bluefinchCheckout.main);
      const customerStore = useCustomerStore();
      const loadingStore = useLoadingStore();
      const paymentStore = usePaymentStore();
      const validationStore = useValidationStore();

      loadingStore.setLoadingState(true);
      paymentStore.setErrorMessage('');

      const mappedAddress = await mapAddress(billingAddress);
      const splitName = name.split(' ');
      /* eslint-disable prefer-destructuring */
      mappedAddress.firstname = splitName[0];
      mappedAddress.lastname = splitName[1];
      mappedAddress.telephone = customerStore.selected.shipping.telephone;

      customerStore.createNewBillingAddress('billing');
      customerStore.setAddressToStore(mappedAddress, 'billing');

      const isValid = validationStore.validateAddress('billing') && validationStore.validateField(
        'billing',
        'postcode',
        true,
      );

      if (!isValid) {
        loadingStore.setLoadingState(false);
        paymentStore.setErrorMessage('Please check your address format.');
        return;
      }

      const shippingMethodsStore = useShippingMethodsStore();
      await shippingMethodsStore.setAddressesOnCart();

      const {
        default: {
          helpers: {
            getPaymentExtensionAttributes,
          },
          services: {
            createPaymentRest,
          },
        },
      } = await import(window.bluefinchCheckout.main);

      const paymentMethod = {
        email: customerStore.customer.email,
        paymentMethod: {
          method: 'braintree',
          additional_data: {
            fastlane: this.$state.profileData ? 'Yes' : 'No',
            payment_method_nonce: id,
            is_active_payment_token_enabler: false,
          },
          extension_attributes: getPaymentExtensionAttributes(),
        },
      };

      loadingStore.setLoadingState(true);
      this.handleThreeDS(id)
        .then((nonce) => {
          paymentMethod.paymentMethod.additional_data.payment_method_nonce = nonce;
          return nonce;
        })
        .then(() => createPaymentRest(paymentMethod))
        .then(() => refreshCustomerData(['cart']))
        .then(() => {
          window.location.href = getSuccessPageUrl();
        })
        .catch((error) => {
          try {
            handleServiceError(error);
          } catch (formattedError) {
            paymentStore.setErrorMessage(formattedError);
          }
          loadingStore.setLoadingState(false);
        });
    },

    handleThreeDS(nonce) {
      return new Promise((resolve, reject) => {
        import(window.bluefinchCheckout.main)
          .then(async ({
            default: {
              helpers: {
                deepClone,
              },
              stores: { useBraintreeStore, useCartStore, useCustomerStore },
            },
          }) => {
            const braintreeStore = useBraintreeStore();
            const cartStore = useCartStore();
            const customerStore = useCustomerStore();

            // If 3DS is disabled, skip over this step.
            if (!braintreeStore.threeDSEnabled) {
              resolve(nonce);
              return;
            }

            const billingAddress = deepClone(customerStore.selected.billing);
            billingAddress.countryCodeAlpha2 = billingAddress.country_code;
            billingAddress.region = billingAddress.region.region_code
              || billingAddress.region.region;

            const price = cartStore.cartGrandTotal / 100;
            const threshold = braintreeStore.threeDSThresholdAmount;
            const challengeRequested = braintreeStore.alwaysRequestThreeDS || price >= threshold;

            const threeDSecureParameters = {
              amount: parseFloat(cartStore.cartGrandTotal / 100).toFixed(2),
              nonce,
              bin: {},
              challengeRequested,
              billingAddress,
              onLookupComplete: (lookupData, next) => {
                next();
              },
            };

            const threeDSecureInstance = braintreeStore.$state.threeDSecureInstance
              || window.braintree.threeDSecure
                .create({
                  version: 2,
                  client: this.$state.clientInstance,
                });

            this.$state.threeDSecureInstance = await threeDSecureInstance;

            this.$state.threeDSecureInstance.verifyCard(
              threeDSecureParameters,
            ).then((threeDSResponse) => {
              const liability = {
                shifted: threeDSResponse.liabilityShifted,
                shiftPossible: threeDSResponse.liabilityShiftPossible,
              };

              if (liability.shifted || (!liability.shifted && !liability.shiftPossible)) {
                resolve(threeDSResponse.nonce);
              } else {
                reject(new Error('Please try again with another form of payment.'));
              }

              return true;
            })
              .catch((error) => {
                if (error.code === 'THREEDS_LOOKUP_VALIDATION_ERROR') {
                  const errorMessage = error.details.originalError.details
                    .originalError.error.message;
                  const message = 'Please update the address and try again.';
                  if (errorMessage === 'Billing line1 format is invalid.' && billingAddress.street[0].length > 50) {
                    return reject(new Error(`Billing line1 must be string and less than 50 characters. ${message}`));
                  }
                  if (errorMessage === 'Billing line2 format is invalid.' && billingAddress.street[1].length > 50) {
                    return reject(new Error(`Billing line2 must be string and less than 50 characters. ${message}`));
                  }
                }
                return reject(error);
              });
          });
      });
    },

    async renderWatermark(selector) {
      if (this.$state.fastlaneInstance) {
        // Return early if we are on the email component but with branding disabled.
        if (selector === '#fastlaneEmailWatermark' && !this.$state.config.paypal_fastlane_show_branding) {
          return;
        }

        const fastlaneWatermark = await this.$state.fastlaneInstance.FastlaneWatermarkComponent({
          includeAdditionalInfo: true,
        });

        fastlaneWatermark.render(selector);

        this.setData({ fastlaneWatermark });
      }
    },

    overrideGoToYouDetails() {
      window.bluefinchCheckout.overrides.setDetailsStepActive = async () => {
        const { default: { stores: { useStepsStore } } } = await import(window.bluefinchCheckout.main);
        const stepsStore = useStepsStore();

        if (this.profileData && this.$state.fastlaneInstance) {
          const {
            selectionChanged,
            selectedAddress,
          } = await this.$state.fastlaneInstance.profile.showShippingAddressSelector();

          if (selectionChanged) {
            this.handleShippingAddress(selectedAddress);
          }
        } else {
          stepsStore.goToYouDetails();
        }
      };
    },

    unmountComponent() {
      this.clearCaches(['setup']);

      if (this.$state.clientInstance) {
        this.$state.clientInstance.teardown();
      }
      if (this.$state.dataCollectorInstance) {
        this.$state.dataCollectorInstance.teardown();
      }

      this.setData({
        fastlaneInstance: null,
      });
    },

    getCachedResponse(request, cacheKey, args = {}) {
      if (typeof this.$state.cache[cacheKey] !== 'undefined') {
        return this.$state.cache[cacheKey];
      }

      const data = request(args);
      this.$patch({
        cache: {
          [cacheKey]: data,
        },
      });
      return data;
    },

    clearCaches(cacheKeys) {
      if (cacheKeys.length) {
        cacheKeys.forEach((cacheKey) => {
          this.setData({
            cache: {
              [cacheKey]: undefined,
            },
          });
        });
      }
    },
  },
});
