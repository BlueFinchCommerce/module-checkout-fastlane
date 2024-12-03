export default async () => {
  const { default: { stores: { useBraintreeStore } } } = await import(window.geneCheckout.main);
  const braintreeStore = useBraintreeStore();

  const braintreeCards = braintreeStore.cCTypes || [];
  const cardMap = {
    AE: 'AMEX',
    DI: 'DISCOVER',
    DN: 'DINERS',
    JCB: 'JCB',
    MC: 'MASTER_CARD',
    MI: 'MAESTRO',
    UPD: 'UNION',
    VI: 'VISA',
  };

  return braintreeCards.map((card) => cardMap[card] || null).filter(Boolean);
};
