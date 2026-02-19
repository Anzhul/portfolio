import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import { useEffect, useRef, useState, useMemo } from 'react'
import { ticker } from '../../../utils/AnimationTicker'
import type { TextBoxChoice, DialogueState } from './types'

// --- Constants ---
const TB_CANVAS_W = 768
const TB_CANVAS_H = 336
const TB_PLANE_W = TB_CANVAS_W / 20  // 38.4
const TB_PLANE_H = TB_CANVAS_H / 20  // 16.8

const BATTLE_CANVAS_W = 768
const BATTLE_CANVAS_H = 960
const BATTLE_PLANE_W = BATTLE_CANVAS_W / 20  // 38.4
const BATTLE_PLANE_H = BATTLE_CANVAS_H / 20  // 48

// --- Helpers ---
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

// --- FloatingSprite (unchanged) ---
export function FloatingSprite({ position }: { position: [number, number, number] }) {
  const texture = useLoader(TextureLoader, '/footer-env/Nostalgia.png')
  const meshRef = useRef<THREE.Mesh>(null!)

  useEffect(() => {
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.needsUpdate = true
  }, [texture])

  useEffect(() => {
    const updateHover = () => {
      if (meshRef.current) {
        const time = Date.now() * 0.001
        meshRef.current.position.y = position[1] + Math.sin(time * 1.5) * 0.5
      }
    }
    ticker.add(updateHover)
    return () => ticker.remove(updateHover)
  }, [position])

  const size = 12.8

  return (
    <mesh ref={meshRef} position={position} scale={[-1, 1, 1]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={texture} transparent side={THREE.FrontSide} />
    </mesh>
  )
}

// --- TextBox (CanvasTexture plane rendered in game scene) ---
export function TextBox({
  visible, text, type = 'interact', faceSprite, choices, onClose, gameCamera
}: {
  visible: boolean
  text: string
  type?: 'interact' | 'dialogue'
  faceSprite?: string
  choices?: TextBoxChoice[]
  onClose: () => void
  gameCamera: THREE.OrthographicCamera
}) {
  const meshRef = useRef<THREE.Mesh>(null!)

  // Refs for typewriter state (avoid re-renders)
  const charIndexRef = useRef(0)
  const elapsedRef = useRef(0)
  const isTypingRef = useRef(false)
  const showChoicesRef = useRef(false)
  const selectedChoiceRef = useRef(0)
  const choicesRef = useRef(choices)
  choicesRef.current = choices

  // Face image
  const faceImageRef = useRef<HTMLImageElement | null>(null)
  const faceLoadedRef = useRef(false)

  useEffect(() => {
    if (!faceSprite) return
    const img = new Image()
    img.onload = () => { faceLoadedRef.current = true }
    img.src = faceSprite
    faceImageRef.current = img
    return () => {
      faceImageRef.current = null
      faceLoadedRef.current = false
    }
  }, [faceSprite])

  // Canvas + texture (stable across renders)
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = TB_CANVAS_W
    c.height = TB_CANVAS_H
    const t = new THREE.CanvasTexture(c)
    t.magFilter = THREE.NearestFilter
    t.minFilter = THREE.NearestFilter
    t.generateMipmaps = false
    t.needsUpdate = false // don't upload until first draw
    return { canvas: c, texture: t }
  }, [])

  useEffect(() => () => {
    texture.dispose()
  }, [texture])

  // Reset typewriter on visibility/text change
  useEffect(() => {
    if (visible) {
      console.log('[TextBox] visible=true, text:', text, 'cam:', gameCamera.position.x.toFixed(1), gameCamera.position.y.toFixed(1))
      // Clear canvas immediately to prevent flash of old content
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, TB_CANVAS_W, TB_CANVAS_H)
        texture.needsUpdate = true
      }
      selectedChoiceRef.current = 0
      showChoicesRef.current = false
      if (type === 'dialogue') {
        charIndexRef.current = 0
        elapsedRef.current = 0
        isTypingRef.current = true
      } else {
        charIndexRef.current = text.length
        isTypingRef.current = false
      }
    } else {
      charIndexRef.current = 0
      isTypingRef.current = false
      showChoicesRef.current = false
    }
  }, [visible, text, type, canvas, texture])

  // Draw loop via ticker
  useEffect(() => {
    if (!visible) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = (_ts: number, dt: number) => {
      // Typewriter advance
      if (isTypingRef.current) {
        elapsedRef.current += dt
        const chars = Math.floor(elapsedRef.current / 30)
        if (chars > charIndexRef.current) {
          charIndexRef.current = Math.min(chars, text.length)
        }
        if (charIndexRef.current >= text.length) {
          isTypingRef.current = false
          if (choicesRef.current && choicesRef.current.length > 0) {
            showChoicesRef.current = true
          }
        }
      }

      // Clear
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, TB_CANVAS_W, TB_CANVAS_H)

      // Border
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 4
      ctx.strokeRect(4, 4, TB_CANVAS_W - 8, TB_CANVAS_H - 8)

      // Face sprite — always reserve space if faceSprite prop is set
      let textX = 24
      if (faceSprite) {
        const faceSize = TB_CANVAS_H - 48
        textX = 24 + faceSize + 20
        if (faceImageRef.current && faceLoadedRef.current) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.strokeRect(23, 23, faceSize + 2, faceSize + 2)
          ctx.drawImage(faceImageRef.current, 24, 24, faceSize, faceSize)
        }
      }

      // Text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px monospace'
      ctx.textBaseline = 'top'
      ctx.textAlign = 'left'

      const displayed = text.slice(0, charIndexRef.current)
      const maxW = TB_CANVAS_W - textX - 24
      const lines = wrapText(ctx, displayed, maxW)
      const lineH = 36
      let ty = 32
      for (const line of lines) {
        ctx.fillText(line, textX, ty)
        ty += lineH
      }

      // Choices
      if (showChoicesRef.current && choicesRef.current) {
        ty += 12
        for (let i = 0; i < choicesRef.current.length; i++) {
          ctx.fillStyle = i === selectedChoiceRef.current ? '#ffff00' : '#ffffff'
          ctx.font = 'bold 28px monospace'
          const prefix = i === selectedChoiceRef.current ? '\u2764 ' : '  '
          ctx.fillText(`${prefix}${choicesRef.current[i].label}`, textX, ty)
          ty += lineH
        }
      }

      texture.needsUpdate = true

      // Follow camera (bottom of visible area)
      if (meshRef.current) {
        meshRef.current.position.x = gameCamera.position.x
        meshRef.current.position.y = gameCamera.position.y - 15.6
      }
    }

    ticker.add(draw)
    return () => ticker.remove(draw)
  }, [visible, text, faceSprite, canvas, texture, gameCamera])

  // Keyboard handling
  useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showChoicesRef.current && choicesRef.current) {
        if (e.key === 'ArrowUp' || e.key === 'w') {
          e.stopImmediatePropagation()
          e.preventDefault()
          selectedChoiceRef.current = (selectedChoiceRef.current - 1 + choicesRef.current.length) % choicesRef.current.length
        } else if (e.key === 'ArrowDown' || e.key === 's') {
          e.stopImmediatePropagation()
          e.preventDefault()
          selectedChoiceRef.current = (selectedChoiceRef.current + 1) % choicesRef.current.length
        } else if (e.key === 'Enter') {
          e.stopImmediatePropagation()
          choicesRef.current[selectedChoiceRef.current].onSelect()
        }
      } else if (e.key === 'Enter') {
        if (isTypingRef.current) {
          charIndexRef.current = text.length
          isTypingRef.current = false
          if (choicesRef.current && choicesRef.current.length > 0) {
            showChoicesRef.current = true
          }
        } else if (!showChoicesRef.current) {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [visible, text, onClose])

  if (!visible) return null

  return (
    <mesh ref={meshRef} renderOrder={100} position={[gameCamera.position.x, gameCamera.position.y - 15.6, 10]}>
      <planeGeometry args={[TB_PLANE_W, TB_PLANE_H]} />
      <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} />
    </mesh>
  )
}

// --- BattleGame (CanvasTexture plane rendered in game scene) ---
export function BattleGame({
  onWin, onLose, gameCamera, gameInputRef
}: {
  onWin: () => void
  onLose: () => void
  gameCamera: THREE.OrthographicCamera
  gameInputRef?: React.RefObject<{ active: boolean; startX: number; currentX: number; startY: number; currentY: number; maxDx: number; startTime: number }>
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const onWinRef = useRef(onWin)
  const onLoseRef = useRef(onLose)
  onWinRef.current = onWin
  onLoseRef.current = onLose

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = BATTLE_CANVAS_W
    c.height = BATTLE_CANVAS_H
    const t = new THREE.CanvasTexture(c)
    t.magFilter = THREE.NearestFilter
    t.minFilter = THREE.NearestFilter
    t.generateMipmaps = false
    t.needsUpdate = false // don't upload until first draw
    return { canvas: c, texture: t }
  }, [])

  useEffect(() => () => {
    texture.dispose()
  }, [texture])

  useEffect(() => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let destroyed = false

    // Scale + center the 580x300 game area within the 768x960 canvas
    const GAME_SCALE = 1.3
    const OX = Math.floor((BATTLE_CANVAS_W - 580 * GAME_SCALE) / 2)
    const OY = Math.floor((BATTLE_CANVAS_H - 300 * GAME_SCALE) / 2)
    const W = 580

    // Battle box (in game-area coordinates)
    const boxX = 140, boxY = 60, boxW = 300, boxH = 200

    // Heart
    const heart = { x: boxX + boxW / 2, y: boxY + boxH / 2, size: 8, speed: 2.5 }

    // Game state
    let hp = 20
    const maxHp = 20
    let invincible = 0
    let wave = 0
    let waveTimer = 0
    let spawnTimer = 0
    let gamePhase: 'ready' | 'fighting' | 'transition' | 'won' | 'lost' = 'ready'
    let phaseTimer = 0
    const totalWaves = 3

    type BulletStyle = 'bone' | 'circle' | 'star' | 'diamond'
    type Bullet = {
      x: number; y: number
      vx: number; vy: number
      w: number; h: number
      hitW: number; hitH: number
      style: BulletStyle
      rotation: number
      rotSpeed: number
      color: string
      damage: number
    }
    let bullets: Bullet[] = []
    const keys = { up: false, down: false, left: false, right: false }

    function drawBullet(b: Bullet) {
      ctx!.save()
      ctx!.translate(b.x, b.y)
      ctx!.rotate(b.rotation)
      ctx!.fillStyle = b.color

      if (b.style === 'bone') {
        const shaftW = b.w * 0.5
        const knobR = b.w * 0.6
        ctx!.fillRect(-shaftW / 2, -b.h / 2, shaftW, b.h)
        ctx!.beginPath()
        ctx!.arc(0, -b.h / 2, knobR, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.beginPath()
        ctx!.arc(0, b.h / 2, knobR, 0, Math.PI * 2)
        ctx!.fill()
      } else if (b.style === 'circle') {
        ctx!.beginPath()
        ctx!.arc(0, 0, b.w / 2, 0, Math.PI * 2)
        ctx!.fill()
      } else if (b.style === 'star') {
        const outer = b.w / 2
        const inner = b.w / 5
        ctx!.beginPath()
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? outer : inner
          const angle = (i * Math.PI) / 4
          const px = Math.cos(angle) * r
          const py = Math.sin(angle) * r
          if (i === 0) ctx!.moveTo(px, py)
          else ctx!.lineTo(px, py)
        }
        ctx!.closePath()
        ctx!.fill()
      } else if (b.style === 'diamond') {
        const hw = b.w / 2
        const hh = b.h / 2
        ctx!.beginPath()
        ctx!.moveTo(0, -hh)
        ctx!.lineTo(hw, 0)
        ctx!.lineTo(0, hh)
        ctx!.lineTo(-hw, 0)
        ctx!.closePath()
        ctx!.fill()
      }

      ctx!.restore()
    }

    const keyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true
      if (e.key === 'ArrowDown' || e.key === 's') keys.down = true
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    const keyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false
      if (e.key === 'ArrowDown' || e.key === 's') keys.down = false
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false
    }

    window.addEventListener('keydown', keyDown, true)
    window.addEventListener('keyup', keyUp, true)

    function spawnWaveBullets() {
      if (wave === 0) {
        const y = boxY + 20 + Math.random() * (boxH - 40)
        const boneH = 30 + Math.random() * 20
        bullets.push({
          x: boxX + boxW + 10, y, vx: -2 - Math.random(), vy: 0,
          w: 8, h: boneH,
          hitW: 4, hitH: boneH * 0.75,
          style: 'bone', rotation: 0, rotSpeed: 0,
          color: '#ffffff', damage: 2,
        })
      } else if (wave === 1) {
        const y = boxY + 20 + Math.random() * (boxH - 40)
        if (Math.random() > 0.3) {
          const boneH = 25 + Math.random() * 20
          const fromRight = Math.random() > 0.5
          bullets.push({
            x: fromRight ? boxX + boxW + 10 : boxX - 10,
            y, vx: fromRight ? -2.5 - Math.random() : 2.5 + Math.random(), vy: 0,
            w: 8, h: boneH,
            hitW: 4, hitH: boneH * 0.75,
            style: 'bone', rotation: 0, rotSpeed: 0,
            color: '#ffffff', damage: 2,
          })
        } else {
          const fromRight = Math.random() > 0.5
          bullets.push({
            x: fromRight ? boxX + boxW + 10 : boxX - 10,
            y, vx: fromRight ? -3.5 : 3.5, vy: (Math.random() - 0.5) * 1.5,
            w: 10, h: 10,
            hitW: 6, hitH: 6,
            style: 'circle', rotation: 0, rotSpeed: 0,
            color: '#00ccff', damage: 3,
          })
        }
      } else if (wave === 2) {
        const cx = boxX + boxW / 2
        const cy = boxY + boxH / 2
        const angle = Math.random() * Math.PI * 2
        const speed = 1.2 + Math.random() * 0.8
        if (Math.random() > 0.4) {
          bullets.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            w: 12, h: 12,
            hitW: 6, hitH: 6,
            style: 'star', rotation: 0, rotSpeed: 0.12,
            color: '#ffff00', damage: 2,
          })
        } else {
          bullets.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * (speed + 0.5), vy: Math.sin(angle) * (speed + 0.5),
            w: 10, h: 14,
            hitW: 6, hitH: 8,
            style: 'diamond', rotation: 0, rotSpeed: 0.08,
            color: '#ff66ff', damage: 3,
          })
        }
      }
    }

    function drawHeart(x: number, y: number, size: number, flash: boolean) {
      if (flash && Math.floor(invincible / 3) % 2 === 0) return
      ctx!.fillStyle = '#ff0000'
      ctx!.beginPath()
      const s = size
      ctx!.moveTo(x, y - s * 0.4)
      ctx!.bezierCurveTo(x - s, y - s * 1.2, x - s * 1.4, y + s * 0.2, x, y + s)
      ctx!.bezierCurveTo(x + s * 1.4, y + s * 0.2, x + s, y - s * 1.2, x, y - s * 0.4)
      ctx!.fill()
    }

    function drawHpBar() {
      ctx!.fillStyle = '#ffffff'
      ctx!.font = 'bold 16px monospace'
      ctx!.textAlign = 'left'
      ctx!.fillText('HP', 20, 35)

      ctx!.fillStyle = '#ff0000'
      ctx!.fillRect(50, 22, 200, 18)
      ctx!.fillStyle = '#ffff00'
      ctx!.fillRect(50, 22, 200 * (hp / maxHp), 18)

      ctx!.fillStyle = '#ffffff'
      ctx!.textAlign = 'right'
      ctx!.fillText(`${hp} / ${maxHp}`, 300, 35)
    }

    let frameAccum = 0
    const TARGET_DT = 1000 / 60

    const update = (_ts: number, deltaTime: number) => {
      if (destroyed) return

      frameAccum += deltaTime
      if (frameAccum < TARGET_DT) return
      frameAccum -= TARGET_DT

      // Clear full canvas
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, BATTLE_CANVAS_W, BATTLE_CANVAS_H)

      // Translate + scale to center the 580x300 game area
      ctx.save()
      ctx.translate(OX, OY)
      ctx.scale(GAME_SCALE, GAME_SCALE)

      drawHpBar()

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.strokeRect(boxX, boxY, boxW, boxH)

      if (gamePhase === 'ready') {
        phaseTimer++
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 20px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`Wave ${wave + 1}`, W / 2, boxY + boxH / 2 - 10)
        ctx.font = '14px monospace'
        ctx.fillText('Dodge the attacks!', W / 2, boxY + boxH / 2 + 15)
        drawHeart(heart.x, heart.y, heart.size, false)
        if (phaseTimer > 90) {
          gamePhase = 'fighting'
          phaseTimer = 0
          waveTimer = 0
          spawnTimer = 0
          bullets = []
        }
      } else if (gamePhase === 'fighting') {
        waveTimer++
        spawnTimer++

        const spawnRate = wave === 2 ? 12 : 8
        if (spawnTimer >= spawnRate) {
          spawnTimer = 0
          spawnWaveBullets()
        }

        // Drag input from TV (mapped to 4-directional movement)
        let dragUp = false, dragDown = false, dragLeft = false, dragRight = false
        if (gameInputRef?.current?.active) {
          const dx = gameInputRef.current.currentX - gameInputRef.current.startX
          const dy = gameInputRef.current.currentY - gameInputRef.current.startY
          const threshold = 20
          if (dx > threshold) dragRight = true
          if (dx < -threshold) dragLeft = true
          if (dy > threshold) dragDown = true
          if (dy < -threshold) dragUp = true
        }

        if (keys.up || dragUp) heart.y -= heart.speed
        if (keys.down || dragDown) heart.y += heart.speed
        if (keys.left || dragLeft) heart.x -= heart.speed
        if (keys.right || dragRight) heart.x += heart.speed

        heart.x = Math.max(boxX + heart.size, Math.min(boxX + boxW - heart.size, heart.x))
        heart.y = Math.max(boxY + heart.size, Math.min(boxY + boxH - heart.size, heart.y))

        bullets = bullets.filter(b => {
          b.x += b.vx
          b.y += b.vy
          b.rotation += b.rotSpeed
          return b.x > boxX - 60 && b.x < boxX + boxW + 60 && b.y > boxY - 60 && b.y < boxY + boxH + 60
        })

        ctx.save()
        ctx.beginPath()
        ctx.rect(boxX + 2, boxY + 2, boxW - 4, boxH - 4)
        ctx.clip()
        bullets.forEach(b => drawBullet(b))
        ctx.restore()

        if (invincible <= 0) {
          for (const b of bullets) {
            const dx = Math.abs(heart.x - b.x)
            const dy = Math.abs(heart.y - b.y)
            if (dx < (heart.size + b.hitW / 2) && dy < (heart.size + b.hitH / 2)) {
              hp -= b.damage
              invincible = 30
              if (hp <= 0) {
                hp = 0
                gamePhase = 'lost'
                phaseTimer = 0
              }
              break
            }
          }
        }
        if (invincible > 0) invincible--
        drawHeart(heart.x, heart.y, heart.size, invincible > 0)

        if (waveTimer > 360) {
          wave++
          if (wave >= totalWaves) {
            gamePhase = 'won'
            phaseTimer = 0
          } else {
            gamePhase = 'transition'
            phaseTimer = 0
            bullets = []
          }
        }
      } else if (gamePhase === 'transition') {
        phaseTimer++
        drawHeart(heart.x, heart.y, heart.size, false)
        ctx.fillStyle = '#ffffff'
        ctx.font = '16px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('...', W / 2, boxY + boxH / 2)
        if (phaseTimer > 60) {
          gamePhase = 'ready'
          phaseTimer = 0
        }
      } else if (gamePhase === 'won') {
        phaseTimer++
        drawHeart(heart.x, heart.y, heart.size, false)
        ctx.fillStyle = '#ffff00'
        ctx.font = 'bold 20px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('YOU WON!', W / 2, boxY + boxH / 2)
        if (phaseTimer > 120) {
          destroyed = true
          ctx.restore()
          texture.needsUpdate = true
          onWinRef.current()
          return
        }
      } else if (gamePhase === 'lost') {
        phaseTimer++
        ctx.fillStyle = '#ff0000'
        ctx.font = 'bold 20px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('YOU FELL...', W / 2, boxY + boxH / 2)
        if (phaseTimer > 120) {
          destroyed = true
          ctx.restore()
          texture.needsUpdate = true
          onLoseRef.current()
          return
        }
      }

      ctx.restore()
      texture.needsUpdate = true

      // Follow camera
      if (meshRef.current) {
        meshRef.current.position.x = gameCamera.position.x
        meshRef.current.position.y = gameCamera.position.y
      }
    }

    ticker.add(update)

    return () => {
      destroyed = true
      ticker.remove(update)
      window.removeEventListener('keydown', keyDown, true)
      window.removeEventListener('keyup', keyUp, true)
    }
  }, [canvas, texture, gameCamera])

  return (
    <mesh ref={meshRef} renderOrder={101} position={[gameCamera.position.x, gameCamera.position.y, 11]}>
      <planeGeometry args={[BATTLE_PLANE_W, BATTLE_PLANE_H]} />
      <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} />
    </mesh>
  )
}

// --- NostalgiaDialogue (battle now renders directly in game scene) ---
export function NostalgiaDialogue({
  position, playerPositionRef, gameCamera, npcInRangeRef, autoWalkRef, gameInputRef
}: {
  position: [number, number, number]
  playerPositionRef: React.MutableRefObject<THREE.Vector3>
  gameCamera: THREE.OrthographicCamera
  npcInRangeRef?: React.MutableRefObject<boolean>
  autoWalkRef?: React.MutableRefObject<number | null>
  gameInputRef?: React.RefObject<{ active: boolean; startX: number; currentX: number; startY: number; currentY: number; maxDx: number; startTime: number }>
}) {
  const [inRange, setInRange] = useState(false)
  const [dialogueState, setDialogueState] = useState<DialogueState>('idle')
  const loggedOnceRef = useRef(false)

  // Distance check
  useEffect(() => {
    const checkDistance = () => {
      if (!playerPositionRef.current) return
      const dx = playerPositionRef.current.x - position[0]
      const dy = playerPositionRef.current.y - position[1]
      const dist = Math.sqrt(dx * dx + dy * dy)
      const isClose = dist < 8

      // Log once to confirm distance check is running
      if (!loggedOnceRef.current) {
        loggedOnceRef.current = true
        console.log('[Dialogue] Distance check active, player:', playerPositionRef.current.toArray(), 'NPC:', position, 'dist:', dist.toFixed(1))
      }

      if (isClose !== inRange) {
        console.log('[Dialogue] inRange changed:', isClose, '(dist:', dist.toFixed(1), ')')
        setInRange(isClose)
        if (!isClose && dialogueState !== 'battle' && dialogueState !== 'victory' && dialogueState !== 'defeat') {
          setDialogueState('idle')
        }
      }

      // Auto-start dialogue when player arrives via auto-walk
      if (isClose && autoWalkRef?.current !== null && autoWalkRef?.current !== undefined && dialogueState === 'idle') {
        autoWalkRef.current = null
        setDialogueState('greeting')
      }
    }
    ticker.add(checkDistance)
    return () => ticker.remove(checkDistance)
  }, [position, inRange, playerPositionRef, dialogueState, autoWalkRef])

  // Sync dialogue-active state to ref (used by TVModel to gate tap → Enter)
  useEffect(() => {
    if (npcInRangeRef) npcInRangeRef.current = dialogueState !== 'idle'
  }, [dialogueState, npcInRangeRef])

  // Enter to start dialogue when in range and idle
  useEffect(() => {
    if (!inRange || dialogueState !== 'idle') return
    console.log('[Dialogue] Listening for Enter key (inRange=true, state=idle)')
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        console.log('[Dialogue] Enter pressed → greeting')
        setDialogueState('greeting')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inRange, dialogueState])

  return (
    <>
      <FloatingSprite position={[position[0], position[1] - 0.5, position[2]]} />

      <TextBox
        visible={dialogueState === 'greeting'}
        text="Hello Traveler!"
        type="dialogue"
        faceSprite="/footer-env/Nostalgia.png"
        onClose={() => setDialogueState('question')}
        gameCamera={gameCamera}
      />

      <TextBox
        visible={dialogueState === 'question'}
        text="Would you like to do battle?"
        type="dialogue"
        faceSprite="/footer-env/Nostalgia.png"
        choices={[
          { label: 'Yes', onSelect: () => setDialogueState('battle') },
          { label: 'No', onSelect: () => setDialogueState('decline') },
        ]}
        onClose={() => {}}
        gameCamera={gameCamera}
      />

      <TextBox
        visible={dialogueState === 'decline'}
        text="Perhaps another time..."
        type="dialogue"
        faceSprite="/footer-env/Nostalgia.png"
        onClose={() => setDialogueState('idle')}
        gameCamera={gameCamera}
      />

      {dialogueState === 'battle' && (
        <BattleGame
          onWin={() => setDialogueState('victory')}
          onLose={() => setDialogueState('defeat')}
          gameCamera={gameCamera}
          gameInputRef={gameInputRef}
        />
      )}

      <TextBox
        visible={dialogueState === 'victory'}
        text="Impressive... You have bested me."
        type="dialogue"
        faceSprite="/footer-env/Nostalgia.png"
        onClose={() => setDialogueState('idle')}
        gameCamera={gameCamera}
      />

      <TextBox
        visible={dialogueState === 'defeat'}
        text="You fell... but don't give up."
        type="dialogue"
        faceSprite="/footer-env/Nostalgia.png"
        onClose={() => setDialogueState('idle')}
        gameCamera={gameCamera}
      />
    </>
  )
}
