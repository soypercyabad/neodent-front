import type { FC } from 'react'

interface ToothAnatomyProps {
  numeroPieza: number
  isUpper: boolean
  isSelected: boolean
  isMissing?: boolean
  hasCrown?: boolean
  condicionColor?: string
  className?: string
}

export const ToothAnatomySvg: FC<ToothAnatomyProps> = ({
  numeroPieza,
  isUpper,
  isSelected,
  isMissing = false,
  hasCrown = false,
  condicionColor,
  className = '',
}) => {
  // Determinar morfología dental según el número FDI
  const getMorphology = (num: number): 'molar' | 'premolar' | 'canine' | 'incisor_central' | 'incisor_lateral' => {
    const lastDigit = num % 10
    if (lastDigit === 1) return 'incisor_central'
    if (lastDigit === 2) return 'incisor_lateral'
    if (lastDigit === 3) return 'canine'
    if (lastDigit === 4 || lastDigit === 5) return 'premolar'
    return 'molar'
  }

  const morphology = getMorphology(numeroPieza)
  const lastDigit = numeroPieza % 10
  const isMolar3 = lastDigit === 8 || lastDigit === 5 // Cordal o último molar temporal

  // Identificador único para gradientes por tipo para evitar colisiones
  const gradId = `tooth-${numeroPieza}-${isUpper ? 'up' : 'down'}`

  // Estilos de contorno y sombreado
  const outlineColor = isSelected ? '#2563EB' : isMissing ? '#94A3B8' : '#64748B'
  const strokeWidth = isSelected ? 2.2 : 1.3
  const crownFill = isMissing
    ? 'rgba(241, 245, 249, 0.4)'
    : hasCrown
    ? `url(#${gradId}-crown)`
    : condicionColor
    ? `${condicionColor}33`
    : `url(#${gradId}-enamel)`

  // Dientes del lado izquierdo (cuadrantes 2, 3, 6, 7) se espejan horizontalmente hacia la línea media
  const quadrant = Math.floor(numeroPieza / 10)
  const shouldFlip = quadrant === 2 || quadrant === 3 || quadrant === 6 || quadrant === 7

  return (
    <svg
      viewBox="0 0 52 86"
      className={`w-9 sm:w-10 h-[68px] sm:h-[72px] transition-all duration-150 ${
        isSelected ? 'scale-105 drop-shadow-md' : 'hover:scale-102'
      } ${className}`}
      aria-label={`Pieza dental ${numeroPieza}`}
    >
      <defs>
        {/* Sombreado 3D realista de esmalte de corona (perlado anatómico) */}
        <linearGradient id={`${gradId}-enamel`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#F8FAFC" />
          <stop offset="85%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        {/* Sombreado 3D de raíces anatómicas */}
        <linearGradient id={`${gradId}-root`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#F1F5F9" />
          <stop offset="85%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>

        {/* Raíz palatina / fondo (más profunda en 3D) */}
        <linearGradient id={`${gradId}-root-dark`} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="60%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>

        {/* Gradiente para corona protésica */}
        <linearGradient id={`${gradId}-crown`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FAF5FF" />
          <stop offset="50%" stopColor="#E9D5FF" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>
      </defs>

      <g opacity={isMissing ? 0.35 : 1} transform={shouldFlip ? 'scale(-1, 1) translate(-52, 0)' : undefined}>
        {isUpper ? (
          // =========================================================================
          // ARCADA SUPERIOR (MAXILAR): Raíces arriba, Corona anatómica abajo
          // =========================================================================
          <g>
            {morphology === 'molar' && (
              // MOLAR SUPERIOR (18, 17, 16, 26, 27, 28)
              // Morfología trirradicular auténtica con bifurcación vestibular y corona bicúspide
              <g>
                {/* 1. Raíz Palatina (situada detrás en el centro, más alta y con sombra 3D) */}
                <path
                  d="M 21 34 C 21 22, 22 12, 26 5 C 29 12, 30 22, 30 34 Z"
                  fill={`url(#${gradId}-root-dark)`}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />

                {/* 2. Raíz Mesial Vestibular (Izquierda, curva divergente con ápice redondeado anatómico) */}
                <path
                  d="M 10 40 C 9 28, 9 18, 13 8 C 15 5, 18 6, 18 10 C 18 20, 20 28, 23 35 C 19 37, 14 38, 10 40 Z"
                  fill={`url(#${gradId}-root)`}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />

                {/* 3. Raíz Distal Vestibular (Derecha, curva hacia distal con ápice suave) */}
                <path
                  d={
                    isMolar3
                      ? 'M 41 40 C 40 28, 38 18, 35 10 C 33 7, 30 7, 30 11 C 30 20, 28 28, 27 35 C 32 37, 37 38, 41 40 Z'
                      : 'M 41 40 C 42 28, 42 18, 38 8 C 36 5, 33 6, 33 10 C 33 20, 31 28, 28 35 C 32 37, 37 38, 41 40 Z'
                  }
                  fill={`url(#${gradId}-root)`}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />

                {/* Arco de bifurcación radicular anatómica (curva suave entre raíces) */}
                <path
                  d="M 23 35 Q 26 31 28 35"
                  fill="none"
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />

                {/* 4. Corona Anatómica del Molar Superior */}
                {/* Forma bulbosa de esmalte con dos cúspides redondeadas en borde oclusal */}
                <path
                  d="M 8 42 C 6 48, 6 60, 9 70 C 12 78, 17 80, 20 78 C 23 76, 25 76, 26 77 C 27 76, 29 76, 32 78 C 35 80, 40 78, 43 70 C 46 60, 46 48, 44 42 C 38 45, 14 45, 8 42 Z"
                  fill={crownFill}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />

                {/* Línea cervical anatómica (unión cuello esmalte-cemento) */}
                <path
                  d="M 8 42 Q 26 46 44 42"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.2"
                />

                {/* Surco vestibular de desarrollo y relieve intercuspídeo */}
                <path
                  d="M 26 46 C 26 56, 25 68, 26 77"
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth="1.1"
                />
              </g>
            )}

            {morphology === 'premolar' && (
              // PREMOLAR SUPERIOR (15, 14, 24, 25)
              // Corona bicúspide cónica y raíz suavemente convergente
              <g>
                {/* Raíz cónica con hendidura */}
                <path
                  d="M 16 42 C 16 26, 19 14, 25 5 C 27 5, 29 5, 30 7 C 33 14, 35 26, 35 42 Z"
                  fill={`url(#${gradId}-root)`}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />
                <path
                  d="M 25 12 L 25 36"
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                  strokeDasharray="2,1"
                />

                {/* Corona anatómica premolar */}
                <path
                  d="M 10 43 C 8 49, 8 62, 11 72 C 15 80, 22 83, 26 83 C 30 83, 37 80, 41 72 C 44 62, 44 49, 42 43 C 36 46, 16 46, 10 43 Z"
                  fill={crownFill}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />
                <path
                  d="M 10 43 Q 26 47 42 43"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.2"
                />
                <path
                  d="M 26 47 L 26 80"
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                />
              </g>
            )}

            {morphology === 'canine' && (
              // CANINO SUPERIOR (13, 23)
              // Corona en cúspide afilada y raíz más potente
              <g>
                {/* Raíz más larga y ancha */}
                <path
                  d="M 17 42 C 17 24, 20 10, 25 3 C 27 3, 29 4, 31 10 C 33 24, 34 34, 34 42 Z"
                  fill={`url(#${gradId}-root)`}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />

                {/* Corona con vértice cuspídeo */}
                <path
                  d="M 11 43 C 9 51, 10 64, 13 74 C 17 82, 24 85, 26 85 C 28 85, 35 82, 39 74 C 42 64, 43 51, 41 43 C 35 46, 17 46, 11 43 Z"
                  fill={crownFill}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />
                <path
                  d="M 11 43 Q 26 47 41 43"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.2"
                />
                <path
                  d="M 26 45 L 26 84"
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth="1.2"
                />
              </g>
            )}

            {morphology === 'incisor_central' && (
              // INCISIVO CENTRAL SUPERIOR (11, 21)
              // Corona ancha en pala y borde incisal recto
              <g>
                {/* Raíz cónica recta */}
                <path
                  d="M 18 42 C 18 26, 20 14, 25 4 C 27 4, 29 5, 31 14 C 33 26, 34 34, 34 42 Z"
                  fill={`url(#${gradId}-root)`}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />

                {/* Corona ancha rectangular/trapezoidal */}
                <path
                  d="M 9 43 C 8 51, 9 68, 11 78 C 13 83, 16 84, 26 84 C 36 84, 39 83, 41 78 C 43 68, 44 51, 43 43 C 36 46, 16 46, 9 43 Z"
                  fill={crownFill}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />
                <path
                  d="M 9 43 Q 26 47 43 43"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.2"
                />
                {/* Lóbulos de desarrollo */}
                <path d="M 18 62 L 18 82" fill="none" stroke="#CBD5E1" strokeWidth="0.9" />
                <path d="M 34 62 L 34 82" fill="none" stroke="#CBD5E1" strokeWidth="0.9" />
              </g>
            )}

            {morphology === 'incisor_lateral' && (
              // INCISIVO LATERAL SUPERIOR (12, 22)
              // Más esbelto que el central
              <g>
                <path
                  d="M 19 42 C 19 26, 21 15, 25 6 C 27 6, 29 7, 31 15 C 33 26, 33 34, 33 42 Z"
                  fill={`url(#${gradId}-root)`}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />
                <path
                  d="M 11 43 C 10 50, 11 66, 13 76 C 15 82, 19 83, 26 83 C 33 83, 37 82, 39 76 C 41 66, 42 50, 41 43 C 35 46, 17 46, 11 43 Z"
                  fill={crownFill}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />
                <path
                  d="M 11 43 Q 26 47 41 43"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.2"
                />
                <path d="M 26 60 L 26 81" fill="none" stroke="#CBD5E1" strokeWidth="0.9" />
              </g>
            )}
          </g>
        ) : (
          // =========================================================================
          // ARCADA INFERIOR (MANDÍBULA): Corona anatómica arriba, Raíces abajo
          // =========================================================================
          <g>
            {morphology === 'molar' && (
              // MOLAR INFERIOR (48, 47, 46, 36, 37, 38)
              // Corona amplia con cúspides oclusales arriba + dos raíces curvadas y bifurcación en arco
              <g>
                {/* 1. Corona Anatómica del Molar Inferior */}
                {/* Chewing surface arriba con 2 cúspides suaves y cuello anatómico en y=44 */}
                <path
                  d="M 8 44 C 6 38, 6 26, 9 16 C 12 8, 17 6, 20 8 C 23 10, 25 10, 26 9 C 27 10, 29 10, 32 8 C 35 6, 40 8, 43 16 C 46 26, 46 38, 44 44 C 38 41, 14 41, 8 44 Z"
                  fill={crownFill}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />

                {/* Línea cervical inferior */}
                <path
                  d="M 8 44 Q 26 40 44 44"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.2"
                />

                {/* Surco oclusal-vestibular */}
                <path
                  d="M 26 40 C 26 30, 25 18, 26 9"
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth="1.1"
                />

                {/* 2. Raíz Mesial Inferior (Izquierda, gruesa, curvada hacia distal con ápice suave) */}
                <path
                  d="M 10 46 C 9 58, 9 68, 13 78 C 15 81, 18 80, 18 76 C 18 66, 20 58, 23 51 C 19 49, 14 48, 10 46 Z"
                  fill={`url(#${gradId}-root)`}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />

                {/* 3. Raíz Distal Inferior (Derecha, curvada hacia distal con ápice suave) */}
                <path
                  d={
                    isMolar3
                      ? 'M 41 46 C 40 58, 38 68, 35 76 C 33 79, 30 79, 30 75 C 30 66, 28 58, 27 51 C 32 49, 37 48, 41 46 Z'
                      : 'M 41 46 C 42 58, 42 68, 38 78 C 36 81, 33 80, 33 76 C 33 66, 31 58, 28 51 C 32 49, 37 48, 41 46 Z'
                  }
                  fill={`url(#${gradId}-root)`}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />

                {/* Arco de bifurcación radicular inferior (arco de U invertida suave) */}
                <path
                  d="M 23 51 Q 26 47 28 51"
                  fill="none"
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />
              </g>
            )}

            {morphology === 'premolar' && (
              // PREMOLAR INFERIOR (45, 44, 34, 35)
              <g>
                <path
                  d="M 10 43 C 8 37, 8 24, 11 14 C 15 6, 22 3, 26 3 C 30 3, 37 6, 41 14 C 44 24, 44 37, 42 43 C 36 40, 16 40, 10 43 Z"
                  fill={crownFill}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />
                <path
                  d="M 16 44 C 16 60, 19 72, 25 81 C 27 81, 29 81, 30 79 C 33 72, 35 60, 35 44 Z"
                  fill={`url(#${gradId}-root)`}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />
                <path
                  d="M 10 43 Q 26 39 42 43"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.2"
                />
                <path
                  d="M 26 39 L 26 6"
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                />
              </g>
            )}

            {morphology === 'canine' && (
              // CANINO INFERIOR (43, 33)
              <g>
                <path
                  d="M 11 43 C 9 35, 10 22, 13 12 C 17 4, 24 1, 26 1 C 28 1, 35 4, 39 12 C 42 22, 43 35, 41 43 C 35 40, 17 40, 11 43 Z"
                  fill={crownFill}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />
                <path
                  d="M 17 44 C 17 62, 20 76, 25 83 C 27 83, 29 82, 31 76 C 33 62, 34 52, 34 44 Z"
                  fill={`url(#${gradId}-root)`}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />
                <path
                  d="M 11 43 Q 26 39 41 43"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.2"
                />
                <path
                  d="M 26 41 L 26 2"
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth="1.2"
                />
              </g>
            )}

            {(morphology === 'incisor_central' || morphology === 'incisor_lateral') && (
              // INCISIVOS INFERIORES (42, 41, 31, 32)
              // Delgados y rectos
              <g>
                <path
                  d="M 12 43 C 11 35, 12 21, 14 12 C 16 6, 20 5, 26 5 C 32 5, 36 6, 38 12 C 40 21, 41 35, 40 43 C 35 40, 17 40, 12 43 Z"
                  fill={crownFill}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />
                <path
                  d="M 19 44 C 19 60, 21 71, 25 80 C 27 80, 29 79, 31 71 C 33 60, 33 50, 33 44 Z"
                  fill={`url(#${gradId}-root)`}
                  stroke={outlineColor}
                  strokeWidth={strokeWidth}
                />
                <path
                  d="M 12 43 Q 26 39 40 43"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.2"
                />
                <path d="M 26 37 L 26 7" fill="none" stroke="#CBD5E1" strokeWidth="0.9" />
              </g>
            )}
          </g>
        )}
      </g>

      {/* Indicador de Corona Protésica */}
      {hasCrown && (
        <text
          x="26"
          y={isUpper ? 68 : 28}
          textAnchor="middle"
          fill="#7C3AED"
          fontSize="11"
          fontWeight="black"
        >
          C
        </text>
      )}

      {/* Marca de Pieza Ausente (Aspa roja distintiva) */}
      {isMissing && (
        <g stroke="#EF4444" strokeWidth="3" strokeLinecap="round">
          <line x1="10" y1="14" x2="42" y2="72" />
          <line x1="42" y1="14" x2="10" y2="72" />
        </g>
      )}
    </svg>
  )
}

