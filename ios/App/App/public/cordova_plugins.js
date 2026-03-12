
  cordova.define('cordova/plugin_list', function(require, exports, module) {
    module.exports = [
      {
          "id": "cordova-sms-plugin.Sms",
          "file": "plugins/cordova-sms-plugin/www/sms.js",
          "pluginId": "cordova-sms-plugin",
        "clobbers": [
          "window.sms"
        ]
        }
    ];
    module.exports.metadata =
    // TOP OF METADATA
    {
      "cordova-sms-plugin": "1.0.5"
    };
    // BOTTOM OF METADATA
    });
    