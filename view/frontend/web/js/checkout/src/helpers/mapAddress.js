export default async (address) => {
  const { default: { stores: { useConfigStore } } } = await import(window.geneCheckout.main);
  const configStore = useConfigStore();

  if (address) {
    return {
      id: null,
      street: [
        address.streetAddress,
      ],
      city: address.locality,
      region: {
        region: address.region,
        region_id: configStore.getRegionId(address.countryCodeAlpha2, address.region),
      },
      country_code: address.countryCodeAlpha2,
      postcode: address.postalCode,
      company: address.company !== 'undefined' ? address.company : '',
      telephone: address.phoneNumber,
      firstname: address.firstName,
      lastname: address.lastName,
    };
  } else {
    return  {};
  }
};
