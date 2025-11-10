async function testDirectURL() {
  // One of the failing URLs from logs (with the latest token from sync)
  const testUrl = 'https://prod-files-secure.s3.us-west-2.amazonaws.com/0c48bd32-4b8c-4b9d-aeb7-e8b48175167d/5cb28bda-24be-42a7-8ab8-2292a00d1352/4d14e98a-b39d-4df5-b27c-4396ff97aad6.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB4665PRNW3UW%2F20251110%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20251110T044914Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEDQaCXVzLXdlc3QtMiJHMEUCIQC1FXeY%2Beuryo1WE%2FKFtdO0DfmvEqfMXz5iCmCVht8OigIgRRI3tyEmqld%2FbzBy8%2F7vYFNXceNLF1NapagyX1T%2FgcIqiAQI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDYzNzQyMzE4MzgwNSIMyV3Wv18GpSNTf1mcKtwDNaq13Gny9y0ZY6aJibDbLFI7OgIOHBjKgO5B3uVEjONiyePhuqU2mow5EaKPlN8v22pNzW3IVqNVAVAhYylrKc57jb8dVzZXlVIIUuOPZWTMAfegpMmt4p1udIdigzmrCk7ucdSUuM0NoIrNVx2t8nsw3i7%2FzjU441qQaxXxD%2F5cp6uZRpU8CnB8wtwyftnPYQ3Z597rCzH9vZhpwvjT7Y%2Fd8z6WffDIVz%2By5MeJDbnN6xXWaABcUaPxliQTEEQW%2BV4qielI1xF8%2FUWitcuQWyTy4kd1fElXdaIPH4g8W%2B8OH080Fe4dI6EJ6blkMSOSb%2Fut82Qy1kRK3ARLGu8cKyuWhPTypWIyDWgsswvKtvFXsnU6x%2BhycFSK9BVE2NwUI%2BDeJoipAedJ2wiMdLskOqU4rK3SJ%2BbQ4saDOb8PlIsKCEg1huJJzj1N1DjKzEfH89vdcZBHcn7GcNCd%2BnznvOrTjObDZIFZN27hYWiSxEIyUzIrPxiVgAMOiNpVeZaUCK4OGne40JiCh5RH5%2FkteqTAFEDWtP%2BP%2Btj7gaxgfnJVgpDC0fJwbTCxH0hrzQAzSKWhywt36gvyzZtebi7rbkG0MVfeqXkK0%2Fj1lgvkJyP%2FGxKebgF9codKXG0wxe%2FEyAY6pgFH%2BM0Ls73TerLZDyEbhl0Gwa0ZIMYSlKwVZmHfBDygzedUYVrkNxBDh9gtQGKjEIQN3Vngl723D%2B3xTHhFXU%2B7dzUKgMJ0T45dRBfWqbkZ4KWhrx8pVZTGVHMn4wQ5p9N%2B7amN2GWOm0ZvvPI8BGXdstEC%2BG9247%2FeegKJ3Kul1DeZg6%2FF%2F4slxZNvPV6xzUqxFNko0S7Asyx%2BOmd5eHIYgtFhK%2FPo&X-Amz-Signature=757a0674693462b43d1e2ef5aff7e861efd1b7157c2b50c60fec2c6c355a5484&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject'

  console.log('\n🔍 Testing AWS S3 URL directly...\n')
  console.log('URL (first 150 chars):', testUrl.substring(0, 150) + '...')

  // Extract timestamp
  const timestampMatch = testUrl.match(/X-Amz-Date=(\d{8}T\d{6}Z)/)
  if (timestampMatch) {
    console.log('URL Timestamp:', timestampMatch[1])

    const timestamp = timestampMatch[1]
    const year = timestamp.substring(0, 4)
    const month = timestamp.substring(4, 6)
    const day = timestamp.substring(6, 8)
    const time = timestamp.substring(9, 15)

    const urlDate = new Date(`${year}-${month}-${day}T${time.substring(0,2)}:${time.substring(2,4)}:${time.substring(4,6)}Z`)
    const now = new Date()
    const minutesOld = (now.getTime() - urlDate.getTime()) / (1000 * 60)

    console.log('URL Age:', minutesOld.toFixed(1), 'minutes')
    console.log('Expires in:', (60 - minutesOld).toFixed(1), 'minutes')
  }

  console.log('\n📡 Fetching URL...\n')

  try {
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    })

    console.log('Status:', response.status, response.statusText)
    console.log('\nResponse Headers:')
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`)
    })

    if (response.ok) {
      const contentType = response.headers.get('content-type')
      const contentLength = response.headers.get('content-length')
      const buffer = await response.arrayBuffer()

      console.log('\n✅ URL is VALID')
      console.log('Content-Type:', contentType)
      console.log('Content-Length:', contentLength)
      console.log('Actual bytes received:', buffer.byteLength)
    } else {
      console.log('\n❌ URL is INVALID')
      const body = await response.text()
      console.log('Response body:', body.substring(0, 500))
    }
  } catch (error) {
    console.error('\n❌ Fetch failed:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
  }
}

testDirectURL()
