import { defineStore } from 'pinia';

import debounce from 'lodash.debounce';

import mapAddress from '../helpers/mapAddress';

export default defineStore('fastlaneStore', {
  state: () => ({
    cache: {},
    config: {
      paypal_fastlane_is_active: false,
    },
    clientInstance: null,
    dataCollectorInstance: null,
    fastlaneInstance: null,
    fastlanePaymentComponent: null,
    fastlaneWatermark: null,
    profileData: null,
    email: null,
    isLookingUpUser: false,
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
        } = await import(window.geneCheckout.main);
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
          authorization: clientToken,
          client: clientInstance,
          deviceData: dataCollectorInstance.deviceData,
        });
        this.setData({ fastlaneInstance });

        this.overrideGoToYouDetails();
      }, 'setup');
    },

    async getConfiguration() {
      const { default: { services: { getStoreConfig } } } = await import(window.geneCheckout.main);

      const configs = [
        'paypal_fastlane_is_active',
        'paypal_fastlane_show_branding',
        'paypal_fastlane_show_cardholder_name',
        'paypal_fastlane_insights_enabled',
        'paypal_fastlane_client_id',
      ];

      const config = await getStoreConfig(configs);

      this.setData({ config });
    },

    async attachEmailListener() {
      // Early return if Fastlane is not active.
      if (!this.$state.config.paypal_fastlane_is_active) {
        return;
      }

      const { default: { stores: { useCustomerStore } } } = await import(window.geneCheckout.main);
      const customerStore = useCustomerStore();

      const debounced = debounce(this.lookupUser, 2000);
      customerStore.$subscribe(async (mutation, payload) => {
        if (mutation.type === 'direct' && typeof payload.customer.email !== 'undefined') {
          if (this.email !== payload.customer.email) {
            debounced(payload.customer.email);
            this.email = payload.customer.email;
          }
        }
      });
    },

    async lookupUser(email) {
      if (!email || this.isLookingUpUser) {
        return;
      }

      this.isLookingUpUser = true;

      const { default: { stores: { useLoadingStore } } } = await import(window.geneCheckout.main);
      const loadingStore = useLoadingStore();

      loadingStore.setLoadingState(true);

      const {
        customerContextId,
      } = await this.$state.fastlaneInstance.identity.lookupCustomerByEmail(email);

      this.setData({
        profileData: null,
      });

      // If we have do have an account then trigger the authentication.
      if (customerContextId) {
        const {
          profileData,
        } = await this.$state.fastlaneInstance
          .identity.triggerAuthenticationFlow(customerContextId);

        if (profileData) {
          await this.setProfileData(profileData, email);
          await this.handleShippingAddress(profileData.shippingAddress);
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

      const { default: { stores: { useCustomerStore } } } = await import(window.geneCheckout.main);
      const customerStore = useCustomerStore();

      if (email) {
        await customerStore.submitEmail(email);
      }
    },

    async handleShippingAddress(shippingAddress) {
      const {
        default: { stores: { useCustomerStore, useStepsStore, useValidationStore } },
      } = await import(window.geneCheckout.main);
      const customerStore = useCustomerStore();
      const validationStore = useValidationStore();

      customerStore.setEmailEntered();
      customerStore.setAddressAsCustom('shipping');

      const mappedAddress = await mapAddress(shippingAddress);
      customerStore.setAddressToStore(mappedAddress, 'shipping');
      customerStore.setAddressAsCustom('shipping');

      const isValid = validationStore.validateAddress('shipping', true)
        && validationStore.validationStore.validateField(
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

      this.getShippingMethods();
    },

    async getShippingMethods() {
      const {
        default: { stores: { useShippingMethodsStore, useStepsStore } },
      } = await import(window.geneCheckout.main);
      const shippingMethodsStore = useShippingMethodsStore();
      const stepsStore = useStepsStore();

      shippingMethodsStore.clearShippingMethodCache();
      await shippingMethodsStore.getShippingMethods();

      if (!shippingMethodsStore.shippingMethods.length) {
        stepsStore.goToShipping();
        return;
      }

      stepsStore.goToPayment();
    },

    async renderFastlanePaymentComponent(selector) {
      if (this.$state.fastlaneInstance) {
        const fields = {
          phoneNumber: {
            prefill: this.$state.profileData?.shippingAddress?.phoneNumber || '',
          },
        };

        // Add the card holder name field if enabled in config.
        if (this.$state.config.paypal_fastlane_show_cardholder_name) {
          fields.cardholderName = {};
        }

        const fastlanePaymentComponent = await this.$state.fastlaneInstance
          .FastlanePaymentComponent({ fields });

        fastlanePaymentComponent.render(selector);

        this.setData({ fastlanePaymentComponent });
      }
    },

    async createPayment() {
      if (!this.$state.fastlanePaymentComponent) {
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
      } = await import(window.geneCheckout.main);
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
      } = await import(window.geneCheckout.main);

      const paymentMethod = {
        email: customerStore.customer.email,
        paymentMethod: {
          method: 'braintree',
          additional_data: {
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
        import(window.geneCheckout.main)
          .then(({
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
            if (!braintreeStore.threeDSEnabled || !braintreeStore.threeDSecureInstance) {
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

            braintreeStore.threeDSecureInstance.verifyCard(
              threeDSecureParameters,
              (err, threeDSResponse) => {
                if (err) {
                  if (err.code === 'THREEDS_LOOKUP_VALIDATION_ERROR') {
                    const errorMessage = err.details.originalError.details
                      .originalError.error.message;
                    const message = 'Please update the address and try again.';
                    if (errorMessage === 'Billing line1 format is invalid.' && billingAddress.street[0].length > 50) {
                      return reject(new Error(`Billing line1 must be string and less than 50 characters. ${message}`));
                    }
                    if (errorMessage === 'Billing line2 format is invalid.' && billingAddress.street[1].length > 50) {
                      return reject(new Error(`Billing line2 must be string and less than 50 characters. ${message}`));
                    }
                  }
                  return reject(err);
                }

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
              },
            );
          })
          .catch(reject);
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
      window.geneCheckout.overrides.setDetailsStepActive = async () => {
        const { default: { stores: { useStepsStore } } } = await import(window.geneCheckout.main);
        const stepsStore = useStepsStore();

        if (this.profileData) {
          const {
            selectionChanged,
            selectedAddress,
          } = await this.fastlaneInstance.profile.showShippingAddressSelector();

          if (selectionChanged) {
            this.handleShippingAddress(selectedAddress);
          }
        } else {
          stepsStore.goToYouDetails();
        }
      };
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
