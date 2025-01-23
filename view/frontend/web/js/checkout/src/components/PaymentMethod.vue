<template>
  <div
    v-if="config.paypal_fastlane_is_active && MyButton && !userLoggedIn"
    class="fastlane-payment"
    :class="{ active: isMethodSelected }"
  >
    <component
      :is="RadioButton"
      :text="paymentTitle"
      :checked="isMethodSelected"
      class="fastlane-payment-radio"
      @click="selectFastlane"
      @keydown="selectFastlane"
    />
    <component
      :is="ErrorMessage"
      v-if="errorMessage && isMethodSelected"
      :message="errorMessage"
      :attached="false"
    />
    <div
      :id="id"
      :class="{ hidden: !isMethodSelected }"
    />
    <component
      :is="Agreements"
      v-if="isMethodSelected"
      id="fastlane"
    />
    <component :is="PrivacyPolicy" v-if="isMethodSelected" />
    <component
      :is="Recaptcha"
      v-show="getTypeByPlacement"
      id="braintree"
      location="fastlane" />
    <component
      :is="MyButton"
      v-if="isMethodSelected"
      class="fastlane-payment-button"
      :label="$t('Pay')"
      primary
      :disabled="buttonDisabled"
      @click="createPayment()"
    />
  </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';
import useFastlaneStore from '../stores/FastlaneStore';

export default {
  name: 'FastlanePaymentMethod',

  data() {
    return {
      errorMessage: '',
      id: 'fastlanePaymentComponent',
      isMethodSelected: false,
      selectedMethod: 'fastlane',
      getTypeByPlacement: null,
      paymentTitle: '',
      paymentType: 'fastlane',
      Agreements: null,
      ErrorMessage: null,
      MyButton: null,
      PrivacyPolicy: null,
      RadioButton: null,
      Recaptcha: null,
      userLoggedIn: false,
    };
  },
  computed: {
    ...mapState(useFastlaneStore, ['config', 'profileData']),
  },
  watch: {
    selectedMethod: {
      handler(newVal) {
        if (newVal !== null && newVal !== this.paymentType) {
          this.isMethodSelected = false;
        }
      },
      immediate: true,
      deep: true,
    },
  },
  async mounted() {
    const {
      default: {
        components: {
          Agreements,
          ErrorMessage,
          MyButton,
          PrivacyPolicy,
          RadioButton,
          Recaptcha,
        },
        stores: {
          useCartStore, useConfigStore, usePaymentStore, useRecaptchaStore, useCustomerStore,
        },
      },
    } = await import(window.bluefinchCheckout.main);

    this.Agreements = Agreements;
    this.ErrorMessage = ErrorMessage;
    this.MyButton = MyButton;
    this.RadioButton = RadioButton;
    this.Recaptcha = Recaptcha;
    this.PrivacyPolicy = PrivacyPolicy;

    const cartStore = useCartStore();
    const configStore = useConfigStore();
    const paymentStore = usePaymentStore();
    const recaptchaStore = useRecaptchaStore();
    const customerStore = useCustomerStore();

    this.userLoggedIn = customerStore.isLoggedIn;
    if (!this.userLoggedIn) {
      await configStore.getInitialConfig();
      await cartStore.getCart();

      this.getTypeByPlacement = recaptchaStore.getTypeByPlacement('braintree');
      this.paymentTitle = paymentStore.getPaymentMethodTitle('braintree');

      paymentStore.$subscribe((mutation) => {
        if (typeof mutation.payload !== 'undefined'
          && typeof mutation.payload.errorMessage !== 'undefined') {
          this.errorMessage = mutation.payload.errorMessage;
        }
      });

      paymentStore.setPaymentErrorMessage('');
      this.errorMessage = paymentStore.errorMessage;

      paymentStore.$subscribe((mutation) => {
        if (typeof mutation.payload.selectedMethod !== 'undefined') {
          this.selectedMethod = mutation.payload.selectedMethod;
        }
      });

      await this.setup();

      this.renderFastlanePaymentComponent(`#${this.id}`);

      this.selectFastlane();
    }
  },

  methods: {
    ...mapActions(useFastlaneStore, [
      'createPayment',
      'renderFastlanePaymentComponent',
      'setup',
      'unmountComponent',
    ]),

    async selectFastlane() {
      this.isMethodSelected = true;

      const { default: { stores: { usePaymentStore } } } = await import(window.bluefinchCheckout.main);
      const paymentStore = usePaymentStore();
      paymentStore.selectPaymentMethod('fastlane');
    },
  },
  unmounted() {
    this.unmountComponent();
  },
};

</script>

<style lang="scss">
@import "./fastlanePayment.scss";
</style>
