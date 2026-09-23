/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: [
    'macbook',
    'macbook:3000',
    '*.ts.net',
    'localhost',
    'localhost:3000',
    'lenovo',
    'lenovo:3000'
  ]
};



export default nextConfig;
