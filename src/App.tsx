import AppHeader from "./components/AppHeader";
import ConfigModal from "./components/ConfigModal";
import DropOverlay from "./components/DropOverlay";
import UploadQueue from "./components/UploadQueue";
import ObjectTable from "./components/ObjectTable";
import ConnectionGuide from "./components/ConnectionGuide";
import { useApp } from "./hooks/useApp";
import { Toaster } from "./components/ui/toast";

export default function App() {
  const {
    conn, dispatchConn, upload, prefs, setPrefs, pendingOps,
    copiedText, copyText,
    isDragging, handleDragEnter, handleDragOver, handleDragLeave, handleDrop,
    connectAndList, refreshObjects, addFiles, renameFile, deleteFile, updatePref,
    clearFolderHistory, removeFolderFromHistory,
  } = useApp();

  return (
    <>
      <ConnectionGuide />

      <main
        className="min-h-screen bg-background text-foreground lg:h-screen lg:overflow-hidden"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mx-auto flex h-full w-full max-w-[1800px] flex-col px-4 py-3 md:px-6 md:py-4">
          <AppHeader
            activeFolderUrl={conn.activeFolderUrl}
            connected={conn.connected}
            onOpenConfig={() => dispatchConn({ type: "TOGGLE_CONFIG", open: true })}
            provider={conn.config.provider}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-4 pt-4 lg:flex-row">
            {/* Sidebar — Upload */}
            <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[340px] lg:min-h-0">
              <UploadQueue
                items={upload.queue}
                copiedText={copiedText}
                isUploading={upload.isUploading}
                compressionMode={prefs.compressionMode}
                namingPrefix={prefs.namingPrefix}
                namingStartIndex={prefs.namingStartIndex}
                onCopy={copyText}
                onCompressionModeChange={(m) => updatePref("compressionMode", m)}
                onNamingPrefixChange={(p) => updatePref("namingPrefix", p)}
                onNamingStartIndexChange={(i) => updatePref("namingStartIndex", i)}
                onSelectFiles={addFiles}
              />
            </aside>

            {/* Main Content — File Table */}
            <ObjectTable
              objects={conn.objects}
              copiedText={copiedText}
              connected={conn.connected}
              isLoading={conn.isLoading}
              deletingKey={pendingOps.deletingKey}
              renamingKey={pendingOps.renamingKey}
              onDelete={deleteFile}
              onCopy={copyText}
              onRefresh={refreshObjects}
              onRename={renameFile}
            />
          </div>
        </div>

        <ConfigModal
          config={conn.config}
          activeFolderUrl={conn.activeFolderUrl}
          folderHistory={prefs.folderHistory}
          isLoading={conn.isLoading}
          isOpen={conn.isConfigOpen}
          errorMessage={conn.error}
          onChange={(field, value) => dispatchConn({ type: "SET_CONFIG", field, value })}
          onConnect={connectAndList}
          onClose={() => dispatchConn({ type: "TOGGLE_CONFIG", open: false })}
          onClearFolderHistory={() => setPrefs({ folderHistory: clearFolderHistory(conn.activeFolderUrl) })}
          onDeleteFolderHistoryItem={(url) => setPrefs({ folderHistory: removeFolderFromHistory(url) })}
        />
        <DropOverlay activeFolderUrl={conn.activeFolderUrl} visible={isDragging} />
        <Toaster />
      </main>
    </>
  );
}
