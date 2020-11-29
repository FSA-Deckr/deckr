module.exports = {
	entry: ["./src/index.js"],
	output: {
		path: __dirname + '/server/public',
		filename: "bundle.js",
	},
	mode: 'development',
	resolve: {
		extensions: [".js", ".jsx"],
	},
	devtool: "source-map",
	watchOptions: {
		ignored: /node_modules/,
	},
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				loader: "babel-loader",
				options: {
					presets: ["@babel/preset-react"],
				},
			},
		],
	}
}
