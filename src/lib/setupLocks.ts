import { allPairsAssignedToGroups } from './groups'
import { verifySettingsPassword } from './settingsAccess'
import type { PickleballEvent } from '../types'

export type SetupLockKey = 'participants' | 'pairs' | 'groups'

/** Mật khẩu event nếu có; không thì mật khẩu tab Cài đặt (nội bộ CLB). */
export function verifySetupLockPassword(
  event: PickleballEvent,
  password: string,
): boolean {
  if (event.accessPassword && event.accessPassword.length > 0) {
    return password === event.accessPassword
  }
  return verifySettingsPassword(password)
}

export function isSetupLocked(event: PickleballEvent, key: SetupLockKey): boolean {
  if (key === 'participants') return event.participantsLocked === true
  if (key === 'pairs') return event.pairsLocked === true
  return event.groupsLocked === true
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

export function getSetupLockConfirmMessage(
  key: SetupLockKey,
  action: 'lock' | 'unlock',
): { title: string; message: string; confirmLabel: string } {
  if (action === 'lock') {
    if (key === 'participants') {
      return {
        title: 'Chốt người tham gia',
        message:
          'Sau khi chốt, không thể thêm hoặc xóa người tham gia. Nhập mật khẩu để xác nhận.',
        confirmLabel: 'Chốt',
      }
    }
    if (key === 'pairs') {
      return {
        title: 'Chốt cặp đôi',
        message:
          'Sau khi chốt, không thể random, ghép tay hay thay đổi cặp. Nhập mật khẩu để xác nhận.',
        confirmLabel: 'Chốt',
      }
    }
    return {
      title: 'Chốt bảng đấu',
      message:
        'Sau khi chốt, không thể bật/tắt chia bảng hay đổi bảng của từng cặp. Nhập mật khẩu để xác nhận.',
      confirmLabel: 'Chốt',
    }
  }

  if (key === 'participants') {
    return {
      title: 'Mở khóa người tham gia',
      message:
        'Mở khóa sẽ cho phép chỉnh sửa người tham gia, cặp đôi và bảng đấu. Nhập mật khẩu để xác nhận.',
      confirmLabel: 'Mở khóa',
    }
  }
  if (key === 'pairs') {
    return {
      title: 'Mở khóa cặp đôi',
      message:
        'Mở khóa sẽ cho phép chỉnh sửa cặp đôi và bảng đấu. Nhập mật khẩu để xác nhận.',
      confirmLabel: 'Mở khóa',
    }
  }
  return {
    title: 'Mở khóa bảng đấu',
    message: 'Mở khóa sẽ cho phép thay đổi phân bảng. Nhập mật khẩu để xác nhận.',
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
    }
  }
  if (key === 'pairs') {
    return {
      ...event,
      pairsLocked: false,
      groupsLocked: false,
    }
  }
  return { ...event, groupsLocked: false }
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
  return { ...event, groupsLocked: true }
}
