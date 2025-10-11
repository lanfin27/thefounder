import React from 'react'

export function renderBlock(block: any) {
  const { type, id } = block
  const value = block[type]

  switch (type) {
    case 'paragraph':
      return (
        <p key={id} className="mb-4 text-gray-700 leading-relaxed">
          {renderRichText(value.rich_text)}
        </p>
      )
    case 'heading_1':
      return (
        <h1 key={id} className="text-3xl font-bold mb-4 mt-8">
          {renderRichText(value.rich_text)}
        </h1>
      )
    case 'heading_2':
      return (
        <h2 key={id} className="text-2xl font-bold mb-3 mt-6">
          {renderRichText(value.rich_text)}
        </h2>
      )
    case 'heading_3':
      return (
        <h3 key={id} className="text-xl font-bold mb-2 mt-4">
          {renderRichText(value.rich_text)}
        </h3>
      )
    case 'bulleted_list_item':
      return (
        <li key={id} className="ml-4 mb-2 list-disc">
          {renderRichText(value.rich_text)}
        </li>
      )
    case 'numbered_list_item':
      return (
        <li key={id} className="ml-4 mb-2 list-decimal">
          {renderRichText(value.rich_text)}
        </li>
      )
    case 'quote':
      return (
        <blockquote key={id} className="border-l-4 border-founder-primary pl-4 my-4 italic">
          {renderRichText(value.rich_text)}
        </blockquote>
      )
    case 'code':
      return (
        <pre key={id} className="bg-gray-100 rounded p-4 overflow-x-auto mb-4">
          <code className="text-sm">
            {renderRichText(value.rich_text)}
          </code>
        </pre>
      )
    case 'image':
      const src = value.type === 'external' ? value.external.url : value.file.url
      const caption = value.caption ? renderRichText(value.caption) : ''
      return (
        <figure key={id} className="my-6">
          <img src={src} alt={caption} className="rounded-lg w-full" />
          {caption && (
            <figcaption className="text-center text-sm text-gray-600 mt-2">
              {caption}
            </figcaption>
          )}
        </figure>
      )
    case 'divider':
      return <hr key={id} className="my-8 border-gray-300" />
    default:
      return (
        <div key={id} className="mb-4">
          ❓ Unsupported block ({type})
        </div>
      )
  }
}

function renderRichText(richTexts: any[]) {
  if (!richTexts) return null

  return richTexts.map((text, index) => {
    const { annotations, plain_text, href } = text
    let element = <span key={index}>{plain_text}</span>

    if (annotations.bold) {
      element = <strong key={index}>{plain_text}</strong>
    }
    if (annotations.italic) {
      element = <em key={index}>{plain_text}</em>
    }
    if (annotations.strikethrough) {
      element = <del key={index}>{plain_text}</del>
    }
    if (annotations.underline) {
      element = <u key={index}>{plain_text}</u>
    }
    if (annotations.code) {
      element = (
        <code key={index} className="bg-gray-100 px-1 py-0.5 rounded text-sm">
          {plain_text}
        </code>
      )
    }
    if (href) {
      element = (
        <a
          key={index}
          href={href}
          className="text-founder-primary hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {element}
        </a>
      )
    }

    return element
  })
}