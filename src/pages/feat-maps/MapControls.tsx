import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { Icon } from '../../components/Icons'
import {
  formatDateTime,
  searchByAddress,
  type MapViolation,
  type TimeRange,
} from '../../services/dashboard/mapData'

const MAX_RESULTS = 8
const DEBOUNCE_MS = 300

/* ======================= Search (ARIA combobox) ======================= */

interface LocationSearchProps {
  violations: MapViolation[] // the visible violations (already time-filtered)
  onSelect: (v: MapViolation) => void
  onOpenChange: (open: boolean) => void
}

export function LocationSearch({ violations, onSelect, onOpenChange }: LocationSearchProps) {
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [query, setQuery] = useState('') // debounced copy of text
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  // Wait until the user stops typing for 300 ms
  useEffect(() => {
    const id = setTimeout(() => setQuery(text), DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [text])

  const hasQuery = query.trim() !== ''
  // Recomputed whenever the query or the visible violations (time range) change
  const results = hasQuery ? searchByAddress(violations, query).slice(0, MAX_RESULTS) : []
  const isOpen = open && hasQuery

  useEffect(() => {
    onOpenChange(isOpen)
  }, [isOpen, onOpenChange])
  useEffect(() => setActive(-1), [query, violations])

  // Click outside closes the list (text is kept)
  useEffect(() => {
    if (!isOpen) return
    const handle = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handle)
    return () => document.removeEventListener('pointerdown', handle)
  }, [isOpen])

  const choose = (v: MapViolation) => {
    setOpen(false)
    onSelect(v)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && isOpen) {
      e.stopPropagation() // close the list only, don't leave the map
      setOpen(false)
    } else if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // Use the latest text right away instead of waiting for the debounce
      const now = text.trim() ? searchByAddress(violations, text).slice(0, MAX_RESULTS) : []
      const pick = active >= 0 && text === query ? results[active] : now[0]
      if (pick) choose(pick)
    }
  }

  return (
    <div className="map-search" ref={wrapRef}>
      <div className="map-search__box">
        <input
          className="map-search__input"
          type="text"
          role="combobox"
          aria-label="Cari lokasi pelanggaran"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && active >= 0 ? `${listId}-${active}` : undefined}
          placeholder="Cari lokasi..."
          maxLength={100}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(e.target.value.trim() !== '')
          }}
          onFocus={() => setOpen(text.trim() !== '')}
          onKeyDown={handleKeyDown}
        />
        <Icon.Search />
      </div>

      {isOpen && (
        <ul className="map-search__results" id={listId} role="listbox" aria-label="Hasil pencarian lokasi">
          {results.length === 0 ? (
            <li className="map-search__empty" role="presentation">
              Lokasi tidak ditemukan
            </li>
          ) : (
            results.map((v, i) => (
              <li
                key={v.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`map-search__result${i === active ? ' map-search__result--active' : ''}`}
                onPointerDown={(e) => e.preventDefault()} // keep focus in the input
                onClick={() => choose(v)}
                onMouseEnter={() => setActive(i)}
              >
                <span className="map-search__address">{v.address}</span>
                <span className="map-search__time">{formatDateTime(v.createdAt)}</span>
              </li>
            ))
          )}
        </ul>
      )}

      {/* Screen readers hear how many results there are */}
      <span className="visually-hidden" aria-live="polite">
        {hasQuery ? `${results.length} hasil ditemukan` : ''}
      </span>
    </div>
  )
}

/* ======================= Time range (listbox dropdown) ======================= */

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
]

interface TimeRangeFilterProps {
  value: TimeRange
  onChange: (value: TimeRange) => void
  onOpenChange: (open: boolean) => void
}

export function TimeRangeFilter({ value, onChange, onOpenChange }: TimeRangeFilterProps) {
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const current = TIME_RANGE_OPTIONS.find((o) => o.value === value)!

  useEffect(() => {
    onOpenChange(open)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return
    listRef.current?.focus()
    const handle = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handle)
    return () => document.removeEventListener('pointerdown', handle)
  }, [open])

  const openList = () => {
    setActive(TIME_RANGE_OPTIONS.findIndex((o) => o.value === value))
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  const pick = (i: number) => {
    onChange(TIME_RANGE_OPTIONS[i].value)
    close()
  }

  const handleListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % TIME_RANGE_OPTIONS.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i <= 0 ? TIME_RANGE_OPTIONS.length - 1 : i - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(active)
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="map-range" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="map-range__button"
        aria-label={`Filter rentang waktu: ${current.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? close() : openList())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            openList()
          }
        }}
      >
        {current.label}
        <Icon.TriangleDown />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          className="map-range__list"
          role="listbox"
          tabIndex={-1}
          aria-label="Filter rentang waktu"
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={handleListKey}
        >
          {TIME_RANGE_OPTIONS.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.value === value}
              className={`map-range__option${i === active ? ' map-range__option--active' : ''}`}
              onClick={() => pick(i)}
              onMouseEnter={() => setActive(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ======================= Zoom +/- ======================= */

export function ZoomControls({ map }: { map: LeafletMap | null }) {
  const [zoom, setZoom] = useState(() => map?.getZoom() ?? 0)

  useEffect(() => {
    if (!map) return
    const update = () => setZoom(map.getZoom())
    update()
    map.on('zoomend', update)
    return () => {
      map.off('zoomend', update)
    }
  }, [map])

  const atMax = !map || zoom >= map.getMaxZoom()
  const atMin = !map || zoom <= map.getMinZoom()

  return (
    <div className="map-zoom">
      <button
        type="button"
        className="map-zoom__btn"
        aria-label="Perbesar peta"
        aria-disabled={atMax}
        onClick={() => !atMax && map?.zoomIn()}
      >
        <Icon.Plus />
      </button>
      <button
        type="button"
        className="map-zoom__btn"
        aria-label="Perkecil peta"
        aria-disabled={atMin}
        onClick={() => !atMin && map?.zoomOut()}
      >
        <Icon.Minus />
      </button>
    </div>
  )
}
