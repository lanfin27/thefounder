/**
 * Test if image proxy actually loads images correctly after the fix
 */

const testImageUrl = '/api/image-proxy?url=https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2F0c48bd32-4b8c-4b9d-aeb7-e8b48175167d%2F46819bf8-97b6-4e68-9c52-f0c18c92af1b%2FGenerated_Image_September_10_2024_at_1104_PM_copy.png%3FX-Amz-Algorithm%3DAWS4-HMAC-SHA256%26X-Amz-Content-Sha256%3DUNSIGNED-PAYLOAD%26X-Amz-Credential%3DASIAZI2LB4666YPDUVV7%252F20251110%252Fus-west-2%252Fs3%252Faws4_request%26X-Amz-Date%3D20251110T050816Z%26X-Amz-Expires%3D3600%26X-Amz-Security-Token%3DIQoJb3JpZ2luX2VjEDQaCXVzLXdlc3QtMiJIMEYCIQD5Ey2%252FAZbxvlR0BG0dO21bpSk%252BWgWzj4xCY9jjRrUa2AIhAI06z%252FSF7TqrUqNJr8W9%252FYRGsEZzmJ4hPbQ%252BuJuJBe%252FYKogECP7%252F%252F%252F%252F%252F%252F%252F%252F%252F%252FwEQABoMNjM3NDIzMTgzODA1IgwYhfg1xNW7svJQ2toq3APr0E7sAjJJFi3KI7tlFwuSFp8lj8w1P%252BCRD1tYEsNmAz%252FNYVl%252Ff8Vg1bBw%252Fe%252FEGaL70Vct%252BG28xaS3uK5X%252FMhfDqlOXD%252BE6Ae3OYDXp6OuMVV3p6%252FwQSDX%252BMvM3u2eHr3QZSg5xaCQICUYZxPXHE1v2uVoN2oJuA3p3lCxoYiqcP8UXzM6YyBt6awCdA5KUtWk1L4Vz4ypgePF9r77%252BbTsXH3YaOzQ7pxFE1%252F02FIQ%252F4qzvt%252BH72zqgfAkAFTIBj5BHUMqCt5p%252BpWs3O2b3wnYvW23FPaZZnvOq9V6%252BYRgXiDOQhsaBjB%252FUFGzA%252F0pR0T4ZUL70yC0yd%252FRK5XZZhEA%252Bt1PNJzzWB0dZvJX2YNWtBb4BzpjIMQqfhIUFEQ7HHt6LW0e%252Ff6QiRgUhH6QNHR8oWMXn%252FmEF31LQB1eUxEE8%252BmQhwL7DwzgvvLuqP%252F9hM%252F23q%252FPPa5HVvHHbJe%252BHcC6%252FXcU38q%252BjQdClDhE%252FfQLMv2DDqhKPvBjqkAZF2EbN2QCL5JHTWzLdBZiwqfJzHQYqL9V7kGKu%252Bz8gP9yvj%252F1e2WW6XPKqXo%252FvTb%252Bm2KJMBEWnCtCeWPq2IM9BLElD2PLqr0%252BfRSe%252FyFQU7EZxzYwgJ6fj5ILu%252F0v8xjMSAw7%252B6q%252F8a7lqhMzRQ6OJF8BDk1xF9RbI9XdBp%252B%252BYjIMx6wWpZuL%252FGIq6xdUZX4I9lBVzS2i4nRGDwJECgLlE8Y%253D%26X-Amz-Signature%3D58f1e0c4c8086e3f0dda9ab07afb54e44095b0e2a07cd94eba15b16dd8daa9fe%26X-Amz-SignedHeaders%3Dhost%26x-amz-checksum-mode%3DENABLED%26x-id%3DGetObject'

const fullUrl = `http://localhost:3002${testImageUrl}`

console.log('\n🖼️  Testing Image Proxy Load\n')
console.log('Testing URL:', fullUrl.substring(0, 120) + '...')

async function testImageLoad() {
  try {
    const response = await fetch(fullUrl)

    console.log('\n📊 Response:')
    console.log('  Status:', response.status, response.statusText)
    console.log('  Content-Type:', response.headers.get('content-type'))
    console.log('  Content-Length:', response.headers.get('content-length'))
    console.log('  Cache-Control:', response.headers.get('cache-control'))

    if (response.ok) {
      const buffer = await response.arrayBuffer()
      console.log('\n✅ SUCCESS! Image loaded correctly')
      console.log('  Bytes received:', buffer.byteLength)
      console.log('\n🎉 The fix worked! Images should now load without 400 errors.')
    } else {
      console.log('\n❌ FAILED! Status:', response.status)
      const text = await response.text()
      console.log('Response body:', text)
    }
  } catch (error) {
    console.error('\n❌ Error:', error)
  }
}

testImageLoad()
