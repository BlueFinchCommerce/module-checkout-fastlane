[![CircleCI](https://dl.circleci.com/status-badge/img/gh/bluefinchcommerce/module-checkout-fastlane/tree/main.svg?style=svg&circle-token=CCIPRJ_XkqiX9NgSAReaDw3gwjonp_bc029db56d2b5c7f5b3cb46c3a47224d5f225094)](https://dl.circleci.com/status-badge/redirect/gh/bluefinchcommerce/module-checkout-fastlane/tree/main)

![Checkout Powered by BlueFinch](./assets/logo.svg)

# Checkout Fastlane Module

## Requirements

- Magento 2.4.6 or higher
- Node 16 or higher (for development purposes only)
- Latest version of BlueFinch Checkout

## Installation

Ensure you have installed the latest version of BlueFinch Checkout, which can be found here, [BlueFinch Checkout](https://github.com/bluefinchcommerce/module-checkout).

To install the Checkout Fastlane module, run the following command in your Magento 2 root directory:

``` composer require bluefinch/module-checkout-fastlane ```

Checkout Fastlane follows the standard installation process for Adobe Commerce.

For information about a module installation in Adobe Commerce, see [Enable or disable modules](https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/tutorials/manage-modules).

Remember to clear any appropriate caches.

Once installed the module follows the same configuration settings as prescribed by the official Fastlane integration documentation, see [Fastlane for Magento](https://commercemarketplace.adobe.com/media/catalog/product/paypal-module-fastlane-1-0-0-ece/user_guides.pdf?1732698229).

## Local frontend development workflow

Please refer to the local frontend development workflow section of the [BlueFinch Checkout contributing guidelines](https://github.com/BlueFinchCommerce/module-checkout/blob/main/.github/CONTRIBUTING.md), that applies to all BlueFinch Checkout extension modules, such as this one.

## CircleCi

CircleCi is a tool for us to use to allow for tested to be run on our modules before they are deployed.

This template comes with EsLint and PHPStan.

You can add more tests to this if you need to.


### Testing your module locally

You can test CircleCi before you push your code.

To do this you need to install circleci locally.

``` brew install circleci```

Then once this has been installed in the main directory of your package then.

```circleci local execute```






