export default (address) => {
  const formattedAddress = {
    firstName: address.firstname,
    lastName: address.lastname,
    company: address.company,
    locality: address.city,
    region: address.region.code,
    postalCode: address.postcode,
    countryCodeAlpha2: address.country.code,
    phoneNumber: address.telephone,
  };

  // Street needs a little bit of extra work because it can be more than two lines.
  formattedAddress.streetAddress = address.street?.[0];

  // If there is a second line available then join all of the remaining array properties together.
  if (address.street?.[1]) {
    formattedAddress.extendedAddress = address.street.slice(1).join(', ');
  }

  return formattedAddress;
};
