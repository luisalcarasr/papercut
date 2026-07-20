import { useCallback } from 'react'
import { useStore } from '../state/store'
import type { ImageSource } from '../domain/piece'

let idCounter = 0

function loadImage(file: File): Promise<ImageSource> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      const img = new Image()
      img.onload = () =>
        resolve({
          id: `img-${++idCounter}-${Date.now()}`,
          name: file.name,
          dataUrl,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        })
      img.onerror = reject
      img.src = dataUrl
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ImageDropzone() {
  const { sources, addSource, removeSource } = useStore()

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
      for (const file of files) {
        const src = await loadImage(file)
        addSource(src)
      }
    },
    [addSource],
  )

  const onFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      for (const file of files) {
        const src = await loadImage(file)
        addSource(src)
      }
      e.target.value = ''
    },
    [addSource],
  )

  return (
    <div className="space-y-3">
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-zinc-600 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <p className="text-zinc-400 text-sm">
          <span className="hidden sm:inline">Drop images here or click to select</span>
          <span className="sm:hidden">Tap to select images</span>
        </p>
        <p className="text-zinc-500 text-xs mt-1">JPEG, PNG supported</p>
        <input
          id="file-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onFileInput}
        />
      </div>

      {sources.length > 0 && (
        <div className="space-y-2">
          {sources.map((src, idx) => (
            <div key={src.id} className="flex items-center gap-3 bg-zinc-800 rounded-lg p-2">
              <img src={src.dataUrl} alt={src.name} className="w-10 h-10 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-200 truncate">{src.name}</p>
                <p className="text-xs text-zinc-500">
                  {src.naturalWidth}×{src.naturalHeight}px — ratio {(src.naturalWidth/src.naturalHeight).toFixed(3)}
                </p>
              </div>
              <span className="text-xs text-zinc-500 mr-1">#{idx + 1}</span>
              <button
                onClick={() => removeSource(src.id)}
                className="text-zinc-500 hover:text-red-400 text-lg leading-none"
                title="Remove"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
