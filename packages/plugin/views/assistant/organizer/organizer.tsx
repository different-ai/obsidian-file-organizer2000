import * as React from "react";
import { TFile, WorkspaceLeaf, Notice } from "obsidian";
import FileOrganizer from "../../../index";
import { debounce } from "lodash";

import { SectionHeader } from "../section-header";
import { SimilarTags } from "./tags";
import { AtomicNotes } from "./chunks";
import { RenameSuggestion } from "./titles/box";
import { SimilarFolderBox } from "./folders/box";
import { RefreshButton } from "./components/refresh-button";
import { ClassificationContainer } from "./ai-format/templates";
import { TranscriptionButton } from "./transcript";
import { EmptyState } from "./components/empty-state";
import { logMessage } from "../../../someUtils";
import { LicenseValidator } from "./components/license-validator";
import { VALID_MEDIA_EXTENSIONS } from "../../../constants";
import { logger } from "../../../services/logger";

interface AssistantViewProps {
  plugin: FileOrganizer;
  leaf: WorkspaceLeaf;
}

const checkIfIsMediaFile = (file: TFile | null): boolean => {
  if (!file) return false;
  return VALID_MEDIA_EXTENSIONS.includes(file.extension);
};

export const AssistantView: React.FC<AssistantViewProps> = ({
  plugin,
  leaf,
}) => {
  const [activeFile, setActiveFile] = React.useState<TFile | null>(null);
  const [noteContent, setNoteContent] = React.useState<string>("");
  const [refreshKey, setRefreshKey] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);
  const [isLicenseValid, setIsLicenseValid] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(true);

  const isMediaFile = React.useMemo(
    () => checkIfIsMediaFile(activeFile),
    [activeFile]
  );

  const isInIgnoredPatterns = React.useMemo(
    () =>
      plugin
        .getAllIgnoredFolders()
        .some(folder => activeFile?.path.startsWith(folder)),
    [activeFile, plugin.getAllIgnoredFolders]
  );

  const updateActiveFile = React.useCallback(async () => {
    logMessage("updating active file");
    // Check if the Assistant view is visible before processing
    const isVisible =
      leaf.view.containerEl.isShown() &&
      !plugin.app.workspace.rightSplit.collapsed;
    if (!isVisible) return;

    try {
      const file = plugin.app.workspace.getActiveFile();
      if (file && !isMediaFile) {
        const content = await plugin.app.vault.read(file);
        setNoteContent(content);
      }
      setActiveFile(file);
    } catch (err) {
      logger.error("Error updating active file:", err);
      setError("Failed to load file content");
    }
  }, [
    plugin.app.workspace,
    plugin.app.vault,
    leaf.view.containerEl,
    plugin.app.workspace.rightSplit.collapsed,
    leaf.view.containerEl.isShown,
    isMediaFile,
  ]);

  React.useEffect(() => {
    updateActiveFile();
    const debouncedUpdate = debounce(updateActiveFile, 300);

    // Attach event listeners
    plugin.app.workspace.on("file-open", debouncedUpdate);
    plugin.app.workspace.on("active-leaf-change", debouncedUpdate);

    // Cleanup function to remove event listeners
    return () => {
      plugin.app.workspace.off("file-open", debouncedUpdate);
      plugin.app.workspace.off("active-leaf-change", debouncedUpdate);
      debouncedUpdate.cancel();
    };
  }, [updateActiveFile, plugin.app.workspace]);

  const refreshContext = React.useCallback(() => {
    setRefreshKey(prevKey => prevKey + 1);
    setError(null);
    updateActiveFile();
  }, [updateActiveFile]);

  const renderSection = React.useCallback(
    (component: React.ReactNode, errorMessage: string) => {
      try {
        return component;
      } catch (err) {
        logger.error(errorMessage, err);
        return <div className="section-error">{errorMessage}</div>;
      }
    },
    []
  );

  const handleDelete = React.useCallback(async () => {
    if (!activeFile) return;

    try {
      await plugin.app.vault.delete(activeFile);
      new Notice("File deleted successfully");
    } catch (err) {
      logger.error("Error deleting file:", err);
      setError("Failed to delete file");
    }
  }, [activeFile, plugin.app.vault]);

  // Then check license
  if (!isLicenseValid) {
    return (
      <LicenseValidator
        authToken={plugin.getAuthToken()}
        onValidationComplete={() => setIsLicenseValid(true)}
        plugin={plugin}
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        message={`Error: ${error}. Click refresh to try again.`}
        showRefresh={true}
        onRefresh={refreshContext}
      />
    );
  }

  if (!activeFile) {
    return <EmptyState message="Open a file " />;
  }
  if (isInIgnoredPatterns) {
    return (
      <EmptyState message="This file is part of an ignored folder and will not be processed." />
    );
  }

  if (isMediaFile) {
    return (
      <EmptyState message="To process an image or audio file, move it to the Note Companion Inbox Folder (e.g. for image text extraction or audio transcription)." />
    );
  }
  if (!noteContent.trim()) {
    return (
      <EmptyState
        message="This file is empty. Add some content and click refresh to see AI suggestions."
        showRefresh={true}
        onRefresh={refreshContext}
        showDelete={true}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 items-center ">
        <RefreshButton onRefresh={refreshContext} />
        <div className="text-accent">{activeFile.basename}</div>
      </div>

      {renderSection(
        <ClassificationContainer
          plugin={plugin}
          file={activeFile}
          content={noteContent}
          refreshKey={refreshKey}
        />,
        "Error loading classification"
      )}

      <SectionHeader text="Tags" icon="🏷️ " />
      {renderSection(
        <SimilarTags
          plugin={plugin}
          file={activeFile}
          content={noteContent}
          refreshKey={refreshKey}
        />,
        "Error loading tags"
      )}

      {plugin.settings.enableTitleSuggestions && (
        <>
          <SectionHeader text="Titles" icon="💡 " />
          {renderSection(
            <RenameSuggestion
              plugin={plugin}
              file={activeFile}
              content={noteContent}
              refreshKey={refreshKey}
            />,
            "Error loading title suggestions"
          )}
        </>
      )}

      <SectionHeader text="Folders" icon="📁 " />
      {renderSection(
        <SimilarFolderBox
          plugin={plugin}
          file={activeFile}
          content={noteContent}
          refreshKey={refreshKey}
        />,
        "Error loading folder suggestions"
      )}

      {plugin.settings.enableAtomicNotes && (
        <>
          <SectionHeader text="Atomic notes" icon="✂️ " />
          {renderSection(
            <AtomicNotes plugin={plugin} activeFile={activeFile} refreshKey={refreshKey} />,
            "Error loading atomic notes"
          )}
        </>
      )}

      {hasAudioEmbed(noteContent) && (
        <>
          <SectionHeader text="Audio Transcription" icon="🎙️ " />
          {renderSection(
            <TranscriptionButton
              plugin={plugin}
              file={activeFile}
              content={noteContent}
            />,
            "Error loading transcription button"
          )}
        </>
      )}
    </div>
  );
};

const hasAudioEmbed = (content: string): boolean => {
  const audioRegex = /!\[\[(.*\.(mp3|wav|m4a|ogg|webm))]]/i;
  return audioRegex.test(content);
};
