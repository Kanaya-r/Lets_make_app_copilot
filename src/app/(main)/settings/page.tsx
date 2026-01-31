'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiExclamation } from 'react-icons/hi';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components/Modal';
import styles from './page.module.scss';

export default function SettingsPage() {
  const router = useRouter();
  const {
    user,
    userProfile,
    isLoading,
    handleLogOut,
    joinShare,
    leaveShare,
    revokeChildAccess,
    childAccounts,
    enableSharePermission,
    isSharePermissionActive,
    sharePermissionRemainingTime,
  } = useAuth();

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [shareCodeInput, setShareCodeInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isLoading || !user || !userProfile) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>設定</h1>
        </div>
        <div className={styles.emptyList}>読み込み中...</div>
      </div>
    );
  }

  const isParent = userProfile.accountType === 'parent';

  // 共有コードをコピー
  const handleCopyShareCode = async () => {
    if (userProfile.shareCode) {
      await navigator.clipboard.writeText(userProfile.shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 共有に参加
  const handleJoinShare = async () => {
    if (!shareCodeInput.trim()) return;
    setIsProcessing(true);
    try {
      await joinShare(shareCodeInput.toUpperCase());
      setShowJoinModal(false);
      setShareCodeInput('');
    } catch {
      // エラーはAuthContext内でトースト表示される
    } finally {
      setIsProcessing(false);
    }
  };

  // 共有から離脱
  const handleLeaveShare = async () => {
    setIsProcessing(true);
    try {
      await leaveShare();
      setShowLeaveConfirm(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // 子アカウントの共有を取り消し
  const handleRevokeChild = async (childUid: string) => {
    setIsProcessing(true);
    try {
      await revokeChildAccess(childUid);
      setShowRevokeConfirm(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // ログアウト
  const handleLogOutClick = async () => {
    await handleLogOut();
    router.push('/login');
  };

  return (
    <div className={styles.page}>
      {/* ヘッダー */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>設定</h1>
      </div>

      {/* アカウント情報 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>アカウント</h2>
        <div className={styles.item}>
          <span className={styles.itemLabel}>メールアドレス</span>
          <span className={styles.itemValue}>{user.email}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.itemLabel}>アカウントタイプ</span>
          <span className={styles.itemValue}>
            <span className={`${styles.badge} ${isParent ? styles.parent : styles.child}`}>
              {isParent ? 'オーナー' : '共有メンバー'}
            </span>
          </span>
        </div>
      </section>

      {/* 共有管理 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>データ共有</h2>

        {isParent ? (
          <>
            {/* オーナーの場合：共有コード表示 */}
            <div className={styles.shareCodeDisplay}>
              <div className={styles.shareCodeValue}>{userProfile.shareCode}</div>
              <button
                onClick={handleCopyShareCode}
                className={`${styles.button} ${styles.secondaryButton}`}
              >
                {copied ? 'コピーしました！' : 'コードをコピー'}
              </button>
              <p className={styles.shareCodeHint}>
                このコードを共有したい人に教えてください
              </p>
            </div>

            {/* 共有登録許可ボタン */}
            <div className={styles.sharePermission}>
              {isSharePermissionActive ? (
                <div className={styles.permissionActive}>
                  <span className={styles.permissionStatus}>
                    共有登録受付中
                  </span>
                  {typeof sharePermissionRemainingTime === 'number' && sharePermissionRemainingTime > 0 && (
                    <span className={styles.permissionTimer}>
                      残り {Math.floor(sharePermissionRemainingTime / 60)}分{sharePermissionRemainingTime % 60}秒
                    </span>
                  )}
                </div>
              ) : (
                <button
                  onClick={enableSharePermission}
                  className={`${styles.button} ${styles.primaryButton}`}
                  disabled={isProcessing}
                >
                  共有登録を許可（5分間）
                </button>
              )}
              <p className={styles.shareCodeHint}>
                新規メンバーの登録を受け付けるにはこのボタンを押してください
              </p>
            </div>

            {/* 子アカウント一覧 */}
            {childAccounts.length > 0 && (
              <div className={styles.childList}>
                <div className={styles.item}>
                  <span className={styles.itemLabel}>共有メンバー</span>
                </div>
                {childAccounts.map((child) => (
                  <div key={child.uid} className={styles.childItem}>
                    <span className={styles.childEmail}>{child.email}</span>
                    <button
                      onClick={() => setShowRevokeConfirm(child.uid)}
                      className={`${styles.button} ${styles.outlineButton}`}
                    >
                      解除
                    </button>
                  </div>
                ))}
              </div>
            )}

            {childAccounts.length === 0 && (
              <div className={styles.emptyList}>
                まだ誰とも共有していません
              </div>
            )}
          </>
        ) : (
          <>
            {/* 子アカウントの場合：共有状態と離脱オプション */}
            <div className={styles.item}>
              <span className={styles.itemLabel}>共有元</span>
              <span className={styles.itemValue}>オーナーのデータを共有中</span>
            </div>
            <div className={styles.item}>
              <span className={styles.itemLabel}>共有を解除</span>
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className={`${styles.button} ${styles.outlineButton}`}
              >
                共有から離脱
              </button>
            </div>
          </>
        )}

        {/* オーナーの場合も他のデータベースに参加可能 */}
        {isParent && (
          <div className={styles.item}>
            <span className={styles.itemLabel}>他のデータベースに参加</span>
            <button
              onClick={() => setShowJoinModal(true)}
              className={`${styles.button} ${styles.primaryButton}`}
            >
              共有コードで参加
            </button>
          </div>
        )}
      </section>

      {/* ログアウトボタン */}
      <button onClick={() => setShowLogoutConfirm(true)} className={styles.logoutButton}>
        ログアウト
      </button>

      {/* 共有参加モーダル */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          setShareCodeInput('');
        }}
        title="共有に参加"
      >
        <div className={styles.modalForm}>
          <div className={styles.warning}>
            <HiExclamation /> 注意: 共有に参加すると、現在のデータは新しいオーナーのデータに置き換わります
          </div>
          <input
            type="text"
            value={shareCodeInput}
            onChange={(e) => setShareCodeInput(e.target.value.toUpperCase())}
            placeholder="共有コードを入力"
            className={styles.modalInput}
            maxLength={10}
          />
          <div className={styles.modalButtons}>
            <button
              onClick={() => {
                setShowJoinModal(false);
                setShareCodeInput('');
              }}
              className={`${styles.modalButton} ${styles.secondaryButton}`}
              disabled={isProcessing}
            >
              キャンセル
            </button>
            <button
              onClick={handleJoinShare}
              className={`${styles.modalButton} ${styles.primaryButton}`}
              disabled={isProcessing || !shareCodeInput.trim()}
            >
              {isProcessing ? '処理中...' : '参加する'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 共有離脱確認モーダル */}
      <Modal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        title="共有から離脱"
      >
        <div className={styles.modalForm}>
          <p>共有から離脱すると、新しい空のデータベースが作成されます。共有元のデータは引き継がれません。</p>
          <div className={styles.modalButtons}>
            <button
              onClick={() => setShowLeaveConfirm(false)}
              className={`${styles.modalButton} ${styles.secondaryButton}`}
              disabled={isProcessing}
            >
              キャンセル
            </button>
            <button
              onClick={handleLeaveShare}
              className={`${styles.modalButton} ${styles.dangerButton}`}
              disabled={isProcessing}
            >
              {isProcessing ? '処理中...' : '離脱する'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 子アカウント解除確認モーダル */}
      <Modal
        isOpen={!!showRevokeConfirm}
        onClose={() => setShowRevokeConfirm(null)}
        title="共有を解除"
      >
        <div className={styles.modalForm}>
          <p>このユーザーとの共有を解除します。解除されたユーザーには新しい空のデータベースが作成されます。</p>
          <div className={styles.modalButtons}>
            <button
              onClick={() => setShowRevokeConfirm(null)}
              className={`${styles.modalButton} ${styles.secondaryButton}`}
              disabled={isProcessing}
            >
              キャンセル
            </button>
            <button
              onClick={() => showRevokeConfirm && handleRevokeChild(showRevokeConfirm)}
              className={`${styles.modalButton} ${styles.dangerButton}`}
              disabled={isProcessing}
            >
              {isProcessing ? '処理中...' : '解除する'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ログアウト確認モーダル */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="ログアウト"
      >
        <div className={styles.modalForm}>
          <p>ログアウトしますか？</p>
          <div className={styles.modalButtons}>
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className={`${styles.modalButton} ${styles.secondaryButton}`}
            >
              キャンセル
            </button>
            <button
              onClick={handleLogOutClick}
              className={`${styles.modalButton} ${styles.dangerButton}`}
            >
              ログアウト
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
