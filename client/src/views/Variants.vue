<template lang="pug">
main
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      a#mainLink(href="/#/variants/list")
        | {{ st.tr["View alphabetical variants list"] }}
      div(v-html="content")
</template>

<script>
import { store } from "@/store";
import afterRawLoad from "@/utils/afterRawLoad";
export default {
  name: "my-variants",
  data: function() {
    return {
      st: store.state
    };
  },
  computed: {
    content: function() {
      return (
        afterRawLoad(
          require(
            "raw-loader!@/translations/variants/" + this.st.lang + ".pug"
          ).default
        )
      );
    }
  },
  methods: {
    // oninput listener, required for smartphones:
    setCurPrefix: function(e) {
      this.curPrefix = e.target.value;
    },
    getLink: function(vname) {
      return "/variants/" + vname;
    },
    getVclasses: function(varray, idx) {
      const idxMod2 = idx % 2;
      return {
        'col-md-offset-1': idxMod2 == 0,
        'col-lg-offset-2': idxMod2 == 0,
        'last-noneighb': idxMod2 == 0 && idx == varray.length - 1
      };
    },
  }
};
</script>

<style lang="sass" scoped>
a#mainLink
  display: block
  margin: 10px auto
  text-align: center
  font-size: 1.3em
</style>
