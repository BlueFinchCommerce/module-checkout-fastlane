export default async () => {
  const { default: { stores: { useConfigStore } } } = await import(window.geneCheckout.main);
  const configStore = useConfigStore();

  return configStore.countries.map(({ id }) => id);
};
