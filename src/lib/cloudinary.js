const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export async function uploadImage(file, folder = 'products') {
  const body = new FormData()
  body.append('file', file)
  body.append('upload_preset', PRESET)
  body.append('folder', folder)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body })
  if (!res.ok) throw new Error('Image upload failed. Check your Cloudinary cloud name and upload preset.')
  const data = await res.json()
  return data.secure_url
}

// Adds auto format/quality and a width to any Cloudinary URL
export function img(url, width = 800) {
  if (!url || !url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
}
