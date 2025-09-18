// +build wasm

package main

import (
	"testing"
)

func TestIsValidURLWasm(t *testing.T) {
	tests := []struct {
		url      string
		expected bool
	}{
		{"https://example.com/feed.xml", true},
		{"http://example.com/feed.xml", true},
		{"https://news.example.com/rss", true},
		{"ftp://example.com/feed.xml", false},
		{"invalid-url", false},
		{"", false},
		{"https://localhost/feed.xml", false},
		{"https://127.0.0.1/feed.xml", false},
		{"https://192.168.1.1/feed.xml", false},
		{"https://10.0.0.1/feed.xml", false},
		{"https://172.16.0.1/feed.xml", false},
	}

	for _, test := range tests {
		result := isValidURL(test.url)
		if result != test.expected {
			t.Errorf("isValidURL(%q) = %v, expected %v", test.url, result, test.expected)
		}
	}
}

func TestShouldFilterItemWasm(t *testing.T) {
	// テスト用のアイテム
	item1 := Item{
		Title: "正常な記事タイトル",
		Link:  "https://example.com/article/1",
	}

	item2 := Item{
		Title: "PR: 広告記事",
		Link:  "https://example.com/article/2",
	}

	item3 := Item{
		Title: "【広告】キャンペーン情報",
		Link:  "https://example.com/article/3",
	}

	item4 := Item{
		Title: "除外対象の記事",
		Link:  "https://example-news.com/article/123",
	}

	tests := []struct {
		item     Item
		expected bool
	}{
		{item1, false}, // フィルターに引っかからない
		{item2, true},  // タイトルに"PR:"が含まれる
		{item3, true},  // タイトルに"【広告】"が含まれる
		{item4, true},  // URLが除外リストに含まれる
	}

	for i, test := range tests {
		result := shouldFilterItem(test.item)
		if result != test.expected {
			t.Errorf("Test %d: shouldFilterItem() = %v, expected %v", i+1, result, test.expected)
		}
	}
}

func TestFilterRSSWasm(t *testing.T) {
	// テスト用のRSSデータ
	originalRSS := &RSS{
		Version: "2.0",
		Channel: Channel{
			Title:       "テストフィード",
			Link:        "https://example.com",
			Description: "テスト用RSSフィード",
			Language:    "ja",
			Items: []Item{
				{
					Title: "正常な記事1",
					Link:  "https://example.com/article/1",
				},
				{
					Title: "PR: 広告記事",
					Link:  "https://example.com/article/2",
				},
				{
					Title: "正常な記事2",
					Link:  "https://example.com/article/3",
				},
				{
					Title: "除外対象の記事",
					Link:  "https://example-news.com/article/123",
				},
			},
		},
	}

	filteredRSS := filterRSS(originalRSS)

	// フィルタリング後のアイテム数が2つになることを確認
	if len(filteredRSS.Channel.Items) != 2 {
		t.Errorf("Expected 2 items after filtering, got %d", len(filteredRSS.Channel.Items))
	}

	// 残ったアイテムのタイトルを確認
	expectedTitles := []string{"正常な記事1", "正常な記事2"}
	for i, item := range filteredRSS.Channel.Items {
		if item.Title != expectedTitles[i] {
			t.Errorf("Expected title %q, got %q", expectedTitles[i], item.Title)
		}
	}
}

func TestParseRSSWasm(t *testing.T) {
	// テスト用のRSS XML
	rssXML := `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>テストフィード</title>
    <link>https://example.com</link>
    <description>テスト用RSSフィード</description>
    <language>ja</language>
    <item>
      <title>テスト記事1</title>
      <link>https://example.com/article/1</link>
      <description>テスト記事の説明</description>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
      <guid>https://example.com/article/1</guid>
    </item>
  </channel>
</rss>`

	rss, err := parseRSS(rssXML)
	if err != nil {
		t.Fatalf("Failed to parse RSS: %v", err)
	}

	// 基本的な構造を確認
	if rss.Version != "2.0" {
		t.Errorf("Expected version 2.0, got %s", rss.Version)
	}

	if rss.Channel.Title != "テストフィード" {
		t.Errorf("Expected title 'テストフィード', got %s", rss.Channel.Title)
	}

	if len(rss.Channel.Items) != 1 {
		t.Errorf("Expected 1 item, got %d", len(rss.Channel.Items))
	}

	if rss.Channel.Items[0].Title != "テスト記事1" {
		t.Errorf("Expected item title 'テスト記事1', got %s", rss.Channel.Items[0].Title)
	}
}

func TestGenerateRSSWasm(t *testing.T) {
	// テスト用のRSSデータ
	rss := &RSS{
		Version: "2.0",
		Channel: Channel{
			Title:       "テストフィード",
			Link:        "https://example.com",
			Description: "テスト用RSSフィード",
			Language:    "ja",
			Items: []Item{
				{
					Title: "テスト記事",
					Link:  "https://example.com/article/1",
				},
			},
		},
	}

	xmlContent, err := generateRSS(rss)
	if err != nil {
		t.Fatalf("Failed to generate RSS: %v", err)
	}

	// XMLヘッダーが含まれていることを確認
	if !contains(xmlContent, "<?xml version=\"1.0\" encoding=\"UTF-8\"?>") {
		t.Error("XML header not found in generated content")
	}

	// RSS要素が含まれていることを確認
	if !contains(xmlContent, "<rss version=\"2.0\">") {
		t.Error("RSS element not found in generated content")
	}

	// チャンネルタイトルが含まれていることを確認
	if !contains(xmlContent, "<title>テストフィード</title>") {
		t.Error("Channel title not found in generated content")
	}
}

// ヘルパー関数：文字列が含まれているかチェック
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || 
		(len(s) > len(substr) && (s[:len(substr)] == substr || 
		s[len(s)-len(substr):] == substr || 
		containsInMiddle(s, substr))))
}

func containsInMiddle(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
