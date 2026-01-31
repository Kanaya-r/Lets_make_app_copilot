#!/bin/bash

# git-ftp デプロイスクリプト
# 使用方法: ./deploy.sh [init|push|catchup]

set -e

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== git-ftp デプロイスクリプト ===${NC}"

# 設定ファイルの読み込み
CONFIG_FILE=".git-ftp-config"
if [ -f "$CONFIG_FILE" ]; then
    # 設定ファイルからURLを取得（コメント行を除外）
    FTP_URL=$(grep "^url=" "$CONFIG_FILE" | cut -d'=' -f2-)
    FTP_USER=$(grep "^user=" "$CONFIG_FILE" | cut -d'=' -f2-)
    FTP_PASS=$(grep "^password=" "$CONFIG_FILE" | cut -d'=' -f2-)
    
    if [ -z "$FTP_URL" ] || [ -z "$FTP_USER" ]; then
        echo -e "${RED}エラー: .git-ftp-config にurl/userが設定されていません${NC}"
        exit 1
    fi
else
    echo -e "${RED}エラー: .git-ftp-config が見つかりません${NC}"
    exit 1
fi

# 引数チェック
ACTION=${1:-push}

# Node.jsプロジェクトのビルド
echo -e "${GREEN}[1/3] Next.jsプロジェクトをビルド中...${NC}"
npm run build

# ビルド出力の確認
if [ ! -d "out" ]; then
    echo -e "${RED}エラー: ビルド出力ディレクトリ 'out' が見つかりません${NC}"
    exit 1
fi

echo -e "${GREEN}[2/3] ビルド完了${NC}"

# git-ftpの実行
echo -e "${GREEN}[3/3] FTPにデプロイ中...${NC}"

case $ACTION in
    init)
        echo "初回デプロイを実行します..."
        git ftp init --syncroot out -u "$FTP_USER" -p "$FTP_PASS" "$FTP_URL"
        ;;
    push)
        echo "差分デプロイを実行します..."
        git ftp push --syncroot out -u "$FTP_USER" -p "$FTP_PASS" "$FTP_URL"
        ;;
    catchup)
        echo "サーバーの状態を現在のコミットに同期します..."
        git ftp catchup --syncroot out -u "$FTP_USER" -p "$FTP_PASS" "$FTP_URL"
        ;;
    *)
        echo -e "${RED}不明なアクション: $ACTION${NC}"
        echo "使用方法: ./deploy.sh [init|push|catchup]"
        exit 1
        ;;
esac

echo -e "${GREEN}=== デプロイ完了 ===${NC}"
