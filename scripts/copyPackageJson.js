var pkg = require(__dirname + '/../package.json');

delete pkg.scripts.prepublish;
delete pkg.nyc;

require('fs').writeFileSync(
    __dirname + '/../package/package.json',
    JSON.stringify(pkg, null, '    ')
);
