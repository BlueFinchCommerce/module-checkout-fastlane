# Local workflow

When you install the module it will be able to read from the generated `dist` but for making change it is best to use the `watch` functionality.

Turn on support for vite watch in the admin panel or by using magerun
- `Gene -> Better Checkout -> General -> Enable local developer vite watch mode = yes`
- `n98-magerun config:store:set gene_better_checkout/general/enable_local_developer_vite_watch_mode=1`

```bash
cd view/frontend/web/js/checkout/ # or view/adminhtml/web/js/checkout/
npm ci
npm run build-watch
```

This will populate `view/frontend/web/js/checkout/dist-dev` for use, allowing you to make changes and have them quickly visible on the frontend.
