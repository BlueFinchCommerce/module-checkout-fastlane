export default async () => {
  const { default: { stores: { useConfigStore } } } = await import(window.bluefinchCheckout.main);
  const configStore = useConfigStore();

  return configStore.countries.map(({ id }) => id);
};
