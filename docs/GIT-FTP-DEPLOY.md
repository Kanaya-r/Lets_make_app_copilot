# git-ftp デプロイ設定

このプロジェクトはgit-ftpを使用してFTPサーバーにデプロイできます。

## 前提条件

### git-ftpのインストール

macOSの場合（Homebrew）:
```bash
brew install git-ftp
```

Ubuntuの場合:
```bash
sudo apt-get install git-ftp
```

その他のインストール方法は [git-ftp公式リポジトリ](https://github.com/git-ftp/git-ftp) を参照してください。

## 設定

### 1. FTP接続情報の設定

`.git-ftp-config` ファイルを編集して、FTP接続情報を設定してください：

```
url=ftp://your-ftp-server.com/public_html
user=your-username
password=your-password
```

**セキュリティ上の注意**: パスワードは環境変数で設定することを推奨します。

```bash
export GIT_FTP_PASSWORD="your-password"
```

### 2. 初回デプロイ

初めてデプロイする場合は、以下のコマンドを実行：

```bash
npm run deploy:init
```

### 3. 通常のデプロイ（差分アップロード）

変更があった場合のデプロイ：

```bash
npm run deploy
```

### 4. サーバー状態の同期

手動でサーバーにファイルをアップロードした後など、git-ftpの状態を現在のコミットに同期：

```bash
npm run deploy:catchup
```

## 仕組み

1. `npm run build` でNext.jsプロジェクトをビルド
2. `out/` ディレクトリに静的ファイルが生成される
3. git-ftpが `out/` ディレクトリの内容をFTPサーバーにアップロード

## ファイル構成

- `.git-ftp-config` - FTP接続設定（.gitignoreに含まれています）
- `.git-ftp-include` - アップロード対象のファイル指定
- `.git-ftp-ignore` - アップロード除外ファイル指定
- `deploy.sh` - デプロイスクリプト

## トラブルシューティング

### "git-ftp: command not found"
git-ftpがインストールされていません。上記のインストール手順を実行してください。

### 接続エラー
- FTPサーバーのURL、ユーザー名、パスワードを確認
- FTPサーバーがパッシブモードを使用している場合は `--passive` オプションを追加

### ビルドエラー
`npm run build` を個別に実行してエラーを確認してください。
