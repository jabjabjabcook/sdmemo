package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) SelectSaveFileUri(prefix string) (string, error) {
    now := time.Now()
    defaultFileName := fmt.Sprintf("%s_%s.json", prefix, now.Format("20060102_1504"))
    file, err := wailsRuntime.SaveFileDialog(a.ctx, wailsRuntime.SaveDialogOptions{
        Title: "Please select export file uri.",
        DefaultFilename: defaultFileName,
        Filters: []wailsRuntime.FileFilter{
            {
                DisplayName: "JSON Files (*.json)",
                Pattern:     "*.json",
            },
        },
    })
    if err != nil {
        return "", err
    }
    return file, nil
}

func (a *App) ExportLogs(fileUri string, data string) error {
    var prettyJSON bytes.Buffer
    err := json.Indent(&prettyJSON, []byte(data), "", "  ")
    if err != nil {
        return err
    }
    return os.WriteFile(fileUri, prettyJSON.Bytes(), 0644)
}

func (a *App) SelectFile() (string, error) {
    file, err := wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
        Title: "Please select a file.",
        Filters: []wailsRuntime.FileFilter{
            {
                DisplayName: "JSON Files (*.json)",
                Pattern:     "*.json",
            },
        },
    })
    if err != nil {
        return "", err
    }
    return file, nil
}

func (a *App) ImportLogs(file string) (string, error) {
    data, err := os.ReadFile(file)
    if err != nil {
        return "", err
    }
    return string(data), nil
}