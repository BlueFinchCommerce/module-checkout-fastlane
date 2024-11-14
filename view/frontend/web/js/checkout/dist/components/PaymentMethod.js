import { m as mapState, a as mapActions, u as useFastlaneStore, c as createElementBlock, b as createBlock, r as resolveDynamicComponent, d as createCommentVNode, e as createBaseVNode, n as normalizeClass, o as openBlock } from '../FastlaneStore-D7NEX6o0.js';

var script = {
  name: 'FastlanePaymentMethod',

  data() {
    return {
      errorMessage: '',
      id: 'fastlanePaymentComponent',
      isMethodSelected: false,
      selectedMethod: 'fastlane',
      isRecaptchaVisible: false,
      paymentTitle: '',
      paymentType: 'fastlane',
      Agreements: null,
      ErrorMessage: null,
      MyButton: null,
      PrivacyPolicy: null,
      RadioButton: null,
      Recaptcha: null,
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
        stores: { usePaymentStore, useRecaptchaStore },
      },
    } = await import(window.geneCheckout.main);

    this.Agreements = Agreements;
    this.ErrorMessage = ErrorMessage;
    this.MyButton = MyButton;
    this.RadioButton = RadioButton;
    this.Recaptcha = Recaptcha;
    this.PrivacyPolicy = PrivacyPolicy;

    const paymentStore = usePaymentStore();
    const recaptchaStore = useRecaptchaStore();

    this.isRecaptchaVisible = recaptchaStore.isRecaptchaVisible;
    this.paymentTitle = paymentStore.getPaymentMethodTitle('braintree');

    paymentStore.$subscribe((mutation) => {
      if (typeof mutation.payload !== 'undefined'
        && typeof mutation.payload.errorMessage !== 'undefined') {
        this.errorMessage = mutation.payload.errorMessage;
      }
    });

    this.errorMessage = paymentStore.errorMessage;

    paymentStore.$subscribe((mutation) => {
      if (typeof mutation.payload.selectedMethod !== 'undefined') {
        this.selectedMethod = mutation.payload.selectedMethod;
      }
    });

    await this.setup();

    this.renderFastlanePaymentComponent(`#${this.id}`);

    this.selectFastlane();
  },

  methods: {
    ...mapActions(useFastlaneStore, ['createPayment', 'renderFastlanePaymentComponent', 'setup']),

    async selectFastlane() {
      this.isMethodSelected = true;

      const { default: { stores: { usePaymentStore } } } = await import(window.geneCheckout.main);
      const paymentStore = usePaymentStore();
      paymentStore.selectPaymentMethod('fastlane');
    },
  },
};

const _hoisted_1 = ["id"];

function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_ctx.config.paypal_fastlane_is_active && $data.MyButton)
    ? (openBlock(), createElementBlock("div", {
        key: 0,
        class: normalizeClass(["fastlane-payment", { active: $data.isMethodSelected }])
      }, [
        (openBlock(), createBlock(resolveDynamicComponent($data.RadioButton), {
          text: $data.paymentTitle,
          checked: $data.isMethodSelected,
          class: "fastlane-payment-radio",
          onClick: $options.selectFastlane,
          onKeydown: $options.selectFastlane
        }, null, 40 /* PROPS, NEED_HYDRATION */, ["text", "checked", "onClick", "onKeydown"])),
        ($data.errorMessage && $data.isMethodSelected)
          ? (openBlock(), createBlock(resolveDynamicComponent($data.ErrorMessage), {
              key: 0,
              message: $data.errorMessage,
              attached: false
            }, null, 8 /* PROPS */, ["message"]))
          : createCommentVNode("v-if", true),
        createBaseVNode("div", {
          id: $data.id,
          class: normalizeClass({ hidden: !$data.isMethodSelected })
        }, null, 10 /* CLASS, PROPS */, _hoisted_1),
        ($data.isMethodSelected)
          ? (openBlock(), createBlock(resolveDynamicComponent($data.Agreements), {
              key: 1,
              id: "fastlane"
            }))
          : createCommentVNode("v-if", true),
        ($data.isMethodSelected)
          ? (openBlock(), createBlock(resolveDynamicComponent($data.PrivacyPolicy), { key: 2 }))
          : createCommentVNode("v-if", true),
        ($data.isMethodSelected && $data.isRecaptchaVisible('placeOrder'))
          ? (openBlock(), createBlock(resolveDynamicComponent($data.Recaptcha), {
              key: 3,
              id: "placeOrder",
              location: "fastlane"
            }))
          : createCommentVNode("v-if", true),
        ($data.isMethodSelected)
          ? (openBlock(), createBlock(resolveDynamicComponent($data.MyButton), {
              key: 4,
              class: "fastlane-payment-button",
              label: _ctx.$t('Pay'),
              primary: "",
              disabled: _ctx.buttonDisabled,
              onClick: _cache[0] || (_cache[0] = $event => (_ctx.createPayment()))
            }, null, 8 /* PROPS */, ["label", "disabled"]))
          : createCommentVNode("v-if", true)
      ], 2 /* CLASS */))
    : createCommentVNode("v-if", true)
}

script.render = render;
script.__file = "src/components/PaymentMethod.vue";

export { script as default };
