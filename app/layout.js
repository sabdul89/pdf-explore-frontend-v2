import '../styles/globals.css'

export const metadata = {
  title: 'Docsy',
  description: 'PDF section selection and field detection'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
