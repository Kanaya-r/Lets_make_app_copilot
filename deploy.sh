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
        git ftp init --syncroot out
        ;;
    push)
        echo "差分デプロイを実行します..."
        git ftp push --syncroot out
        ;;
    catchup)
        echo "サーバーの状態を現在のコミットに同期します..."
        git ftp catchup --syncroot out
        ;;
    *)
        echo -e "${RED}不明なアクション: $ACTION${NC}"
        echo "使用方法: ./deploy.sh [init|push|catchup]"
        exit 1
        ;;
esac

echo -e "${GREEN}=== デプロイ完了 ===${NC}"
