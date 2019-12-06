const path = require('path')

const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  mode: process.env.NODE_ENV,
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {},
          },
        ],
      },
      {
        test: /\.css/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.sass$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  entry: {
    main: './src/index.js',
    'edit/edit': './src/edit/index.js',
  },
  output: {
    path: path.resolve(__dirname, 'docs'),
    filename: '[name].js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Anakata',
      chunks: ['main'],
    }),
    new HtmlWebpackPlugin({
      title: 'Anakata edit',
      filename: 'edit/index.html',
      template: './src/edit/index.ejs',
      chunks: ['edit/edit'],
    }),
  ],
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    disableHostCheck: true,
    port: 33333,
  },
}
