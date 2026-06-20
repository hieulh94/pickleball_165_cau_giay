import { allPairsAssignedToGroups } from './groups'
import { filterGroupMatches } from './matches'
import { verifySettingsPassword } from './settingsAccess'
import type { PickleballEvent } from '../types'

export type SetupLockKey = 'participants' | 'pairs' | 'groups' | 'schedule'

const SETUP_LOCK_PASSWORD_SUFFIX = '1'

/** Mật khẩu chốt/mở khóa setup: mật khẩu event + "1" (VD: 165 → 1651). */
export function getSetupLockPassword(event: PickleballEvent): string | null {
  if (event.accessPassword && event.accessPassword.length > 0) {
    return `${event.accessPassword}${SETUP_LOCK_PASSWORD_SUFFIX}`
  }
  return null
}

export function getSetupLockPasswordHint(event: PickleballEvent): string | null {
  if (event.accessPassword && event.accessPassword.length > 0) {
    return `Mật khẩu chốt = mật khẩu event + ${SETUP_LOCK_PASSWORD_SUFFIX} (ví dụ ${event.accessPassword} → ${event.accessPassword}${SETUP_LOCK_PASSWORD_SUFFIX}).`
  }
  return 'Dùng mật khẩu tab Cài đặt CLB.'
}

/** Mật khẩu event + "1" nếu event có mật khẩu; không thì mật khẩu tab Cài đặt. */
export function verifySetupLockPassword(
  event: PickleballEvent,
  password: string,
): boolean {
  const setupLockPassword = getSetupLockPassword(event)
  if (setupLockPassword) {
    return password === setupLockPassword
  }
  return verifySettingsPassword(password)
}

export function isSetupLocked(event: PickleballEvent, key: SetupLockKey): boolean {
  if (key === 'participants') return event.participantsLocked === true
  if (key === 'pairs') return event.pairsLocked === true
  if (key === 'groups') return event.groupsLocked === true
  return event.scheduleLocked === true
}

export function getSetupLockBlockReason(
  event: PickleballEvent,
  key: SetupLockKey,
  unpairedCount = 0,
): string | null {
  if (key === 'participants') {
    if (event.participants.length === 0) {
      return 'Cần có ít nhất một người tham gia trước khi chốt.'
    }
    return null
  }

  if (key === 'pairs') {
    if (!event.participantsLocked) {
      return 'Hãy chốt người tham gia trước.'
    }
    if (event.pairs.length < 2) {
      return 'Cần ít nhất 2 cặp đôi trước khi chốt.'
    }
    if (unpairedCount > 0) {
      return 'Còn người chưa ghép cặp — hãy ghép hết hoặc xóa khỏi danh sách.'
    }
    return null
  }

  if (key === 'groups') {
    if (!event.pairsLocked) {
      return 'Hãy chốt cặp đôi trước.'
    }
    if (!event.splitGroups) {
      return 'Bật chia bảng đấu và phân bảng xong trước khi chốt.'
    }
    if (!allPairsAssignedToGroups(event.pairs, event.groupCount)) {
      return 'Còn cặp chưa phân bảng — hãy phân hết trước khi chốt.'
    }
    return null
  }

  if (!event.pairsLocked) {
    return 'Hãy chốt cặp đôi trước.'
  }
  if (event.splitGroups && !event.groupsLocked) {
    return 'Hãy chốt bảng đấu trước.'
  }
  if (event.courts.length === 0) {
    return 'Cần có ít nhất một sân thi đấu.'
  }
  if (filterGroupMatches(event.matches).length === 0) {
    return 'Cần có lịch vòng bảng trước khi chốt.'
  }
  return null
}

export function getSetupLockConfirmMessage(
  key: SetupLockKey,
  action: 'lock' | 'unlock',
  event?: PickleballEvent,
): { title: string; message: string; confirmLabel: string } {
  const hint = event ? getSetupLockPasswordHint(event) : null
  const withHint = (message: string) => (hint ? `${message} ${hint}` : message)

  if (action === 'lock') {
    if (key === 'participants') {
      return {
        title: 'Chốt người tham gia',
        message: withHint(
          'Sau khi chốt, không thể thêm hoặc xóa người tham gia. Nhập mật khẩu chốt để xác nhận.',
        ),
        confirmLabel: 'Chốt',
      }
    }
    if (key === 'pairs') {
      return {
        title: 'Chốt cặp đôi',
        message: withHint(
          'Sau khi chốt, không thể random, ghép tay hay thay đổi cặp. Nhập mật khẩu chốt để xác nhận.',
        ),
        confirmLabel: 'Chốt',
      }
    }
    if (key === 'groups') {
      return {
        title: 'Chốt bảng đấu',
        message: withHint(
          'Sau khi chốt, không thể bật/tắt chia bảng hay đổi bảng của từng cặp. Nhập mật khẩu chốt để xác nhận.',
        ),
        confirmLabel: 'Chốt',
      }
    }
    return {
      title: 'Chốt lịch thi đấu',
      message: withHint(
        'Sau khi chốt, không thể thêm/xóa sân, tạo lại hay xóa trận vòng bảng. Nhập kết quả vẫn được. Nhập mật khẩu chốt để xác nhận.',
      ),
      confirmLabel: 'Chốt',
    }
  }

  if (key === 'participants') {
    return {
      title: 'Mở khóa người tham gia',
      message: withHint(
        'Mở khóa sẽ cho phép chỉnh sửa người tham gia, cặp đôi, bảng đấu và lịch thi đấu. Nhập mật khẩu chốt để xác nhận.',
      ),
      confirmLabel: 'Mở khóa',
    }
  }
  if (key === 'pairs') {
    return {
      title: 'Mở khóa cặp đôi',
      message: withHint(
        'Mở khóa sẽ cho phép chỉnh sửa cặp đôi, bảng đấu và lịch thi đấu. Nhập mật khẩu chốt để xác nhận.',
      ),
      confirmLabel: 'Mở khóa',
    }
  }
  if (key === 'groups') {
    return {
      title: 'Mở khóa bảng đấu',
      message: withHint(
        'Mở khóa sẽ cho phép thay đổi phân bảng và lịch thi đấu. Nhập mật khẩu chốt để xác nhận.',
      ),
      confirmLabel: 'Mở khóa',
    }
  }
  return {
    title: 'Mở khóa lịch thi đấu',
    message: withHint(
      'Mở khóa sẽ cho phép thêm/xóa sân, tạo lại và xóa trận vòng bảng. Nhập mật khẩu chốt để xác nhận.',
    ),
    confirmLabel: 'Mở khóa',
  }
}

export function applySetupUnlock(
  event: PickleballEvent,
  key: SetupLockKey,
): PickleballEvent {
  if (key === 'participants') {
    return {
      ...event,
      participantsLocked: false,
      pairsLocked: false,
      groupsLocked: false,
      scheduleLocked: false,
    }
  }
  if (key === 'pairs') {
    return {
      ...event,
      pairsLocked: false,
      groupsLocked: false,
      scheduleLocked: false,
    }
  }
  if (key === 'groups') {
    return {
      ...event,
      groupsLocked: false,
      scheduleLocked: false,
    }
  }
  return { ...event, scheduleLocked: false }
}

export function applySetupLock(
  event: PickleballEvent,
  key: SetupLockKey,
): PickleballEvent {
  if (key === 'participants') {
    return { ...event, participantsLocked: true }
  }
  if (key === 'pairs') {
    return { ...event, pairsLocked: true }
  }
  if (key === 'groups') {
    return { ...event, groupsLocked: true }
  }
  return { ...event, scheduleLocked: true }
}
