const appJson = require('./app.json');

module.exports = ({ config }) => {
  // Start with the expo config from app.json
  const expoConfig = { ...appJson.expo, ...config };

  // Dynamically inject RNMAPBOX_MAPS_DOWNLOAD_TOKEN from env
  const mapboxDownloadToken = process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN;

  if (mapboxDownloadToken && mapboxDownloadToken !== 'your_mapbox_secret_download_token_here') {
    // Replace the placeholder in the @rnmapbox/maps plugin config
    expoConfig.plugins = (expoConfig.plugins || []).map((plugin) => {
      if (Array.isArray(plugin) && plugin[0] === '@rnmapbox/maps') {
        return [
          '@rnmapbox/maps',
          {
            ...plugin[1],
            RNMAPBOX_MAPS_DOWNLOAD_TOKEN: mapboxDownloadToken,
          },
        ];
      }
      return plugin;
    });
  }

  return expoConfig;
};
