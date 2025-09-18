//go:build wasm
// +build wasm

package main

import (
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	neturl "net/url"
	"strings"
	"syscall/js"
	"time"
)

// 除外するURLのリスト
var denyURLList = []string{
	"https://example-news.com/article/123",
	"https://example-news.com/article/456",
}

// 除外するタイトルのキーワードリスト
var denyTitleKeywords = []string{
	"PR:",
	"【広告】",
	"キャンペーン情報",
}

// RSS構造体定義
type RSS struct {
	XMLName xml.Name `xml:"rss"`
	Version string   `xml:"version,attr"`
	Channel Channel  `xml:"channel"`
}

type Channel struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	Language    string `xml:"language"`
	Items       []Item `xml:"item"`
}

type Item struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	PubDate     string `xml:"pubDate"`
	GUID        string `xml:"guid"`
}

// メインエントリーポイント
func main() {
	// Cloudflare Workers用のエントリーポイント
	js.Global().Set("handleRequest", js.FuncOf(handleRequestJS))

	// プログラムを終了させない
	select {}
}

// JavaScript用のラッパー関数
func handleRequestJS(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return createJSResponse("Invalid request", 400)
	}

	request := args[0]
	url := request.Get("url").String()

	// URLパラメータからRSSフィードのURLを取得
	parsedURL, err := neturl.Parse(url)
	if err != nil {
		return createJSResponse("Invalid URL", 400)
	}

	queryParams := parsedURL.Query()
	rssURL := queryParams.Get("url")

	if rssURL == "" {
		return createJSResponse("URL parameter is required", 400)
	}

	// URLの検証
	if !isValidURL(rssURL) {
		return createJSResponse("Invalid URL", 400)
	}

	// RSSフィードを取得
	rssContent, err := fetchRSSFeed(rssURL)
	if err != nil {
		return createJSResponse("Failed to fetch RSS feed", 500)
	}

	// RSSフィードを解析
	rss, err := parseRSS(rssContent)
	if err != nil {
		return createJSResponse("Failed to parse RSS feed", 500)
	}

	// フィルタリング処理
	filteredRSS := filterRSS(rss)

	// フィルタリング後のRSSフィードを生成
	filteredXML, err := generateRSS(filteredRSS)
	if err != nil {
		return createJSResponse("Failed to generate filtered RSS", 500)
	}

	// レスポンスを返す
	return createJSResponse(filteredXML, 200)
}

// JavaScript用のレスポンス作成
func createJSResponse(body string, status int) map[string]interface{} {
	headers := make(map[string]string)
	if status == 200 {
		headers["Content-Type"] = "application/rss+xml; charset=utf-8"
		headers["Cache-Control"] = "public, max-age=300"
	} else {
		headers["Content-Type"] = "text/plain; charset=utf-8"
	}

	return map[string]interface{}{
		"status":  status,
		"headers": headers,
		"body":    body,
	}
}

// URLの検証
func isValidURL(rawURL string) bool {
	parsedURL, err := neturl.Parse(rawURL)
	if err != nil {
		return false
	}

	// 基本的なURL検証
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return false
	}

	if parsedURL.Host == "" {
		return false
	}

	// セキュリティ対策：ローカルホストやプライベートIPを拒否
	host := strings.ToLower(parsedURL.Host)
	if strings.Contains(host, "localhost") ||
		strings.Contains(host, "127.0.0.1") ||
		strings.Contains(host, "::1") ||
		strings.HasPrefix(host, "192.168.") ||
		strings.HasPrefix(host, "10.") ||
		strings.HasPrefix(host, "172.") {
		return false
	}

	return true
}

// RSSフィードを取得
func fetchRSSFeed(url string) (string, error) {
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}

	// User-Agentを設定
	req.Header.Set("User-Agent", "RSS-Filter/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP error: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	return string(body), nil
}

// RSSフィードを解析
func parseRSS(content string) (*RSS, error) {
	var rss RSS
	err := xml.Unmarshal([]byte(content), &rss)
	if err != nil {
		return nil, err
	}

	return &rss, nil
}

// RSSフィードをフィルタリング
func filterRSS(rss *RSS) *RSS {
	filteredRSS := &RSS{
		XMLName: rss.XMLName,
		Version: rss.Version,
		Channel: Channel{
			Title:       rss.Channel.Title,
			Link:        rss.Channel.Link,
			Description: rss.Channel.Description,
			Language:    rss.Channel.Language,
			Items:       []Item{},
		},
	}

	// 各アイテムをフィルタリング
	for _, item := range rss.Channel.Items {
		if !shouldFilterItem(item) {
			filteredRSS.Channel.Items = append(filteredRSS.Channel.Items, item)
		}
	}

	return filteredRSS
}

// アイテムがフィルター条件に一致するかチェック
func shouldFilterItem(item Item) bool {
	// URLフィルター（完全一致）
	for _, denyURL := range denyURLList {
		if item.Link == denyURL {
			return true
		}
	}

	// タイトルフィルター（部分一致）
	for _, keyword := range denyTitleKeywords {
		if strings.Contains(item.Title, keyword) {
			return true
		}
	}

	return false
}

// フィルタリング後のRSSフィードを生成
func generateRSS(rss *RSS) (string, error) {
	xmlData, err := xml.MarshalIndent(rss, "", "  ")
	if err != nil {
		return "", err
	}

	// XMLヘッダーを追加
	result := xml.Header + string(xmlData)

	return result, nil
}
