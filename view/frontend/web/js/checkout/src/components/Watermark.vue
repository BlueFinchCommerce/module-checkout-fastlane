<template>
  <div
    v-if="config.paypal_fastlane_is_active
      && config.paypal_fastlane_policy_active && !userLoggedIn"
    :id="id">
    <img :alt="id" src="https://www.paypalobjects.com/fastlane-v1/assets/fastlane-with-tooltip_en_sm_light.0808.svg" />
  </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';
import useFastlaneStore from '../stores/FastlaneStore';

export default {
  name: 'FastlaneWatermark',

  data() {
    return {
      id: 'fastlaneEmailWatermark',
      userLoggedIn: false,
    };
  },

  computed: {
    ...mapState(useFastlaneStore, ['config']),
  },

  async mounted() {
    const {
      default: {
        stores: { useCustomerStore },
      },
    } = await import(window.bluefinchCheckout.main);
    const customerStore = useCustomerStore();
    this.userLoggedIn = customerStore.isLoggedIn;

    if (!this.userLoggedIn) {
      await this.setup();
      this.attachEmailListener();

      if (this.config.paypal_fastlane_is_active && this.config.paypal_fastlane_policy_active) {
        this.renderWatermark(`#${this.id}`);
      }
    }
  },

  methods: {
    ...mapActions(useFastlaneStore, ['setup', 'attachEmailListener', 'renderWatermark']),
  },
};

</script>
