
import './globals.css'

export const metadata = {
  title: 'Territory Account Density Analysis',
  description: 'Interactive map showing active and terminated account density by zip code',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link href='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css' rel='stylesheet' />
      </head>
      <body>{children}</body>
    </html>
  )
}
