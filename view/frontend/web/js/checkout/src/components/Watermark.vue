<template>
  <div
    v-if="config.paypal_fastlane_is_active"
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
    };
  },

  computed: {
    ...mapState(useFastlaneStore, ['config']),
  },

  async mounted() {
    await this.setup();
    this.attachEmailListener();

    this.renderWatermark(`#${this.id}`);
  },

  methods: {
    ...mapActions(useFastlaneStore, ['setup', 'attachEmailListener', 'renderWatermark']),
  },
};

</script>
