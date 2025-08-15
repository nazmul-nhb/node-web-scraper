// @ts-check

import { defineScriptConfig } from 'nhb-scripts';

export default defineScriptConfig({
	format: {
		args: ['--write'],
		files: ['index.mjs', 'lib', 'nhb.scripts.config.mjs'],
		ignorePath: '.prettierignore',
	},
	commit: {
		runFormatter: true,
	},
	count: {
		defaultPath: '.',
		excludePaths: ['node_modules'],
	},
});
