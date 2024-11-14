import { m as mapState, a as mapActions, u as useFastlaneStore, c as createElementBlock, e as createBaseVNode, d as createCommentVNode, o as openBlock } from '../FastlaneStore-D7NEX6o0.js';

var script = {
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

const _hoisted_1 = ["id"];
const _hoisted_2 = ["alt"];

function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_ctx.config.paypal_fastlane_is_active)
    ? (openBlock(), createElementBlock("div", {
        key: 0,
        id: $data.id
      }, [
        createBaseVNode("img", {
          alt: $data.id,
          src: "https://www.paypalobjects.com/fastlane-v1/assets/fastlane-with-tooltip_en_sm_light.0808.svg"
        }, null, 8 /* PROPS */, _hoisted_2)
      ], 8 /* PROPS */, _hoisted_1))
    : createCommentVNode("v-if", true)
}

script.render = render;
script.__file = "src/components/Watermark.vue";

export { script as default };
