import ExcelJS from 'exceljs'
import { getPairLabel } from './pairing'
import type { Match, Pair, Participant } from '../types'

const UNGROUPED_SHEET = 'Lịch thi đấu'
const ALL_GROUPS_SHEET = 'Tất cả bảng'

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF059669' },
}
const TITLE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF064E3B' },
}
const ALT_ROW_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFECFDF5' },
}
const DONE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD1FAE5' },
}
const PENDING_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFEF3C7' },
}
const GROUP_SECTION_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF047857' },
}
const GROUP_GAP_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF0FDF4' },
}
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFA7F3D0' } },
  left: { style: 'thin', color: { argb: 'FFA7F3D0' } },
  bottom: { style: 'thin', color: { argb: 'FFA7F3D0' } },
  right: { style: 'thin', color: { argb: 'FFA7F3D0' } },
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, ' ').trim() || UNGROUPED_SHEET
  return cleaned.slice(0, 31)
}

function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return cleaned || 'event'
}

function pairPlayersLabel(
  pairId: string | null,
  pairs: Pair[],
  participants: Participant[],
): string {
  if (!pairId) return '—'
  const pair = pairs.find((p) => p.id === pairId)
  if (!pair) return '—'
  return getPairLabel(pair, participants)
}

function matchResultLabel(match: Match): string {
  if (
    !match.completed ||
    match.score1 === undefined ||
    match.score2 === undefined
  ) {
    return ''
  }
  return `${match.score1} – ${match.score2}`
}

function groupMatchesBySheet(matches: Match[]): Map<string, Match[]> {
  const byGroup = new Map<string, Match[]>()
  const hasAnyGroup = matches.some((m) => !!m.group)

  for (const match of matches) {
    const key = hasAnyGroup ? (match.group ?? 'Chưa phân bảng') : UNGROUPED_SHEET
    const list = byGroup.get(key) ?? []
    list.push(match)
    byGroup.set(key, list)
  }

  for (const list of byGroup.values()) {
    list.sort((a, b) => a.round - b.round || a.court - b.court)
  }

  return new Map(
    [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b, 'vi')),
  )
}

function sortAllMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const groupCmp = (a.group ?? '').localeCompare(b.group ?? '', 'vi')
    if (groupCmp !== 0) return groupCmp
    return a.round - b.round || a.court - b.court
  })
}

function uniqueSheetName(base: string, used: Set<string>): string {
  let name = sanitizeSheetName(base)
  if (!used.has(name)) {
    used.add(name)
    return name
  }
  let i = 2
  while (used.has(`${name.slice(0, 28)}_${i}`)) i += 1
  name = `${name.slice(0, 28)}_${i}`
  used.add(name)
  return name
}

function styleRange(
  sheet: ExcelJS.Worksheet,
  row: number,
  fromCol: number,
  toCol: number,
  style: Partial<ExcelJS.Style>,
) {
  for (let col = fromCol; col <= toCol; col++) {
    const cell = sheet.getCell(row, col)
    Object.assign(cell, { style: { ...cell.style, ...style } })
  }
}

function buildSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  eventName: string,
  groupName: string,
  matches: Match[],
  pairs: Pair[],
  participants: Participant[],
  options?: { showGroupColumn?: boolean },
) {
  const showGroup = options?.showGroupColumn === true
  const colCount = showGroup ? 7 : 6
  const team1Col = showGroup ? 4 : 3
  const vsCol = showGroup ? 5 : 4
  const team2Col = showGroup ? 6 : 5
  const resultCol = showGroup ? 7 : 6

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: false }],
    properties: { defaultRowHeight: 22 },
  })

  sheet.columns = showGroup
    ? [
        { key: 'group', width: 12 },
        { key: 'round', width: 10 },
        { key: 'court', width: 10 },
        { key: 'team1', width: 40 },
        { key: 'vs', width: 6 },
        { key: 'team2', width: 40 },
        { key: 'result', width: 14 },
      ]
    : [
        { key: 'round', width: 10 },
        { key: 'court', width: 10 },
        { key: 'team1', width: 42 },
        { key: 'vs', width: 6 },
        { key: 'team2', width: 42 },
        { key: 'result', width: 14 },
      ]

  const titleText =
    groupName === ALL_GROUPS_SHEET
      ? `${eventName} — Tất cả bảng`
      : groupName === UNGROUPED_SHEET
        ? `${eventName} — Lịch vòng bảng`
        : `${eventName} — ${groupName}`

  const title = sheet.addRow([titleText])
  sheet.mergeCells(1, 1, 1, colCount)
  title.height = 28
  styleRange(sheet, 1, 1, colCount, {
    font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' }, name: 'Calibri' },
    fill: TITLE_FILL,
    alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
  })

  const doneCount = matches.filter((m) => m.completed).length
  const subtitle = sheet.addRow([
    `${matches.length} trận · ${doneCount} đã có kết quả · ${matches.length - doneCount} chưa đấu`,
  ])
  sheet.mergeCells(2, 1, 2, colCount)
  subtitle.height = 20
  styleRange(sheet, 2, 1, colCount, {
    font: { size: 10, italic: true, color: { argb: 'FF065F46' }, name: 'Calibri' },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD1FAE5' },
    },
    alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
  })

  const headerValues = showGroup
    ? ['Bảng', 'Vòng', 'Sân', 'Đội 1', '', 'Đội 2', 'Kết quả']
    : ['Vòng', 'Sân', 'Đội 1', '', 'Đội 2', 'Kết quả']
  const header = sheet.addRow(headerValues)
  header.height = 24
  styleRange(sheet, 3, 1, colCount, {
    font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' }, name: 'Calibri' },
    fill: HEADER_FILL,
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  })
  sheet.getCell(3, team1Col).alignment = {
    vertical: 'middle',
    horizontal: 'left',
    indent: 1,
  }
  sheet.getCell(3, team2Col).alignment = {
    vertical: 'middle',
    horizontal: 'left',
    indent: 1,
  }

  let dataIndex = 0
  let prevGroup: string | null = null
  let prevRound: number | null = null

  for (const match of matches) {
    const matchGroup = match.group ?? '—'
    const isNewGroup = showGroup && matchGroup !== prevGroup
    const roundChanged = prevRound !== null && match.round !== prevRound

    if (showGroup && isNewGroup) {
      if (prevGroup !== null) {
        const gap = sheet.addRow([])
        gap.height = 14
        for (let col = 1; col <= colCount; col++) {
          gap.getCell(col).fill = GROUP_GAP_FILL
        }
      }

      const groupMatches = matches.filter((m) => (m.group ?? '—') === matchGroup)
      const groupDone = groupMatches.filter((m) => m.completed).length
      const section = sheet.addRow([
        `${matchGroup}  ·  ${groupMatches.length} trận  ·  ${groupDone} có KQ`,
      ])
      sheet.mergeCells(section.number, 1, section.number, colCount)
      section.height = 26
      styleRange(sheet, section.number, 1, colCount, {
        font: {
          bold: true,
          size: 12,
          color: { argb: 'FFFFFFFF' },
          name: 'Calibri',
        },
        fill: GROUP_SECTION_FILL,
        alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
      })

      dataIndex = 0
      prevRound = null
    } else if (!showGroup && roundChanged) {
      const spacer = sheet.addRow([])
      spacer.height = 8
    } else if (showGroup && !isNewGroup && roundChanged) {
      const spacer = sheet.addRow([])
      spacer.height = 6
    }

    prevGroup = matchGroup
    prevRound = match.round

    const row = sheet.addRow(
      showGroup
        ? [
            matchGroup,
            match.round,
            match.court,
            pairPlayersLabel(match.pair1Id, pairs, participants),
            'vs',
            pairPlayersLabel(match.pair2Id, pairs, participants),
            matchResultLabel(match) || '—',
          ]
        : [
            match.round,
            match.court,
            pairPlayersLabel(match.pair1Id, pairs, participants),
            'vs',
            pairPlayersLabel(match.pair2Id, pairs, participants),
            matchResultLabel(match) || '—',
          ],
    )
    row.height = 24
    dataIndex += 1

    const baseFill = dataIndex % 2 === 0 ? ALT_ROW_FILL : undefined
    for (let col = 1; col <= colCount; col++) {
      const cell = row.getCell(col)
      cell.border = THIN_BORDER as ExcelJS.Borders
      cell.font = { size: 11, name: 'Calibri', color: { argb: 'FF111827' } }
      const isTeam = col === team1Col || col === team2Col
      cell.alignment = {
        vertical: 'middle',
        horizontal: isTeam ? 'left' : 'center',
        indent: isTeam ? 1 : 0,
        wrapText: true,
      }
      if (baseFill) cell.fill = baseFill
    }

    row.getCell(vsCol).font = {
      size: 10,
      bold: true,
      name: 'Calibri',
      color: { argb: 'FF6B7280' },
    }

    const resultCell = row.getCell(resultCol)
    if (match.completed) {
      resultCell.fill = DONE_FILL
      resultCell.font = {
        size: 11,
        bold: true,
        name: 'Calibri',
        color: { argb: 'FF047857' },
      }
    } else {
      resultCell.fill = PENDING_FILL
      resultCell.font = {
        size: 11,
        name: 'Calibri',
        color: { argb: 'FF92400E' },
      }
    }
  }

  sheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: sheet.lastRow?.number ?? 3, column: colCount },
  }

  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  }
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function exportGroupScheduleExcel(options: {
  eventName: string
  matches: Match[]
  pairs: Pair[]
  participants: Participant[]
}): Promise<void> {
  const { eventName, matches, pairs, participants } = options
  if (matches.length === 0) return

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Pickleball 165 Cầu Giấy'
  workbook.created = new Date()

  const usedNames = new Set<string>()
  const bySheet = groupMatchesBySheet(matches)
  const hasMultipleGroups = bySheet.size > 1

  if (hasMultipleGroups) {
    buildSheet(
      workbook,
      uniqueSheetName(ALL_GROUPS_SHEET, usedNames),
      eventName,
      ALL_GROUPS_SHEET,
      sortAllMatches(matches),
      pairs,
      participants,
      { showGroupColumn: true },
    )
  }

  for (const [groupName, groupMatches] of bySheet) {
    buildSheet(
      workbook,
      uniqueSheetName(groupName, usedNames),
      eventName,
      groupName,
      groupMatches,
      pairs,
      participants,
    )
  }

  await downloadWorkbook(
    workbook,
    `lich-thi-dau-${sanitizeFileName(eventName)}.xlsx`,
  )
}
