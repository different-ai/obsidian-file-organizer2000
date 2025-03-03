import { normalizePath, TFile } from "obsidian";
import { IdService } from "./id-service";
import moment from "moment";
import { App, TAbstractFile } from "obsidian";
import { FileOrganizerSettings } from "../../settings";
// Using setTimeout type instead of NodeJS.Timeout
type TimeoutID = ReturnType<typeof setTimeout>;

export type FileStatus =
  | "queued"
  | "processing"
  | "completed"
  | "error"
  | "bypassed";

export enum Action {
  CLEANUP = "Cleaning up file...",
  CLEANUP_DONE = "File cleaned up",
  RENAME = "Renaming file...",
  RENAME_DONE = "File renamed",
  EXTRACT = "Extracting content...",
  EXTRACT_DONE = "Content extracted",
  MOVING_ATTACHMENT = "Moving attachments...",
  MOVING_ATTACHEMENT_DONE = "Attachments moved",
  CLASSIFY = "Analyzing document type...",
  CLASSIFY_DONE = "Document type identified",
  TAGGING = "Generating tags...",
  TAGGING_DONE = "Tags generated",
  APPLYING_TAGS = "Applying tags...",
  APPLYING_TAGS_DONE = "Tags applied",
  RECOMMEND_NAME = "Generating file name...",
  RECOMMEND_NAME_DONE = "File name generated",
  CONTAINER = "Creating document container...",
  APPEND = "Appending content...",
  APPEND_DONE = "Content appended",
  ERROR_APPEND = "Failed to append content",
  ERROR_COMPLETE = "Processing failed",
  ERROR_VALIDATE = "Failed to validate document",
  ERROR_CONTAINER = "Failed to create container",
  CONTAINER_DONE = "Container created",
  APPLYING_NAME = "Applying new name...",
  APPLYING_NAME_DONE = "New name applied",
  FORMATTING = "Formatting content...",
  FORMATTING_DONE = "Content formatted",
  MOVING = "Moving to final location...",
  MOVING_DONE = "File moved successfully",
  COMPLETED = "Processing completed",
  VALIDATE = "Validating document...",
  VALIDATE_DONE = "Document validated",
  ERROR_CLEANUP = "Failed to clean up file",
  ERROR_RENAME = "Failed to rename file",
  ERROR_EXTRACT = "Failed to extract content",
  ERROR_MOVING_ATTACHMENT = "Failed to move attachments",
  ERROR_CLASSIFY = "Failed to analyze document type",
  ERROR_TAGGING = "Failed to generate tags",
  ERROR_FORMATTING = "Failed to format content",
  ERROR_MOVING = "Failed to move file",
  FETCH_YOUTUBE = "Fetching YouTube transcript...",
  FETCH_YOUTUBE_DONE = "YouTube transcript fetched",
  ERROR_FETCH_YOUTUBE = "Failed to fetch YouTube transcript",
}

export interface LogEntry {
  timestamp: string;
  completed?: boolean;
  skipped?: boolean;
  error?: {
    message: string;
    stack?: string;
    action: Action;
  };
}

export interface FileRecord {
  id: string;
  tags: string[];
  classification?: string;
  formatted: boolean;
  newPath?: string;
  newName?: string;
  originalName: string;
  logs: Record<Action, LogEntry>;
  status: FileStatus;
  file: TFile | null;
  folder?: string;
}

export class RecordManager {
  private static instance: RecordManager;
  private records: Map<string, FileRecord> = new Map();
  private idService: IdService;
  private app: App;
  private debounceTimeout: TimeoutID | null = null;
  // temp hack while using hardcoded path
  private settings: { recordFilePath: string };

  private constructor(app: App) {
    this.app = app;
    this.idService = IdService.getInstance();
    this.settings = {
      recordFilePath: normalizePath("_FileOrganizer2000/.records"),
    };
    this.loadRecords();
  }

  public static getInstance(app?: App): RecordManager {
    if (!RecordManager.instance) {
      if (!app) {
        throw new Error(
          "RecordManager needs app and settings for initialization"
        );
      }
      RecordManager.instance = new RecordManager(app);
    }
    return RecordManager.instance;
  }

  private async loadRecords(): Promise<void> {
    try {
      const recordFileExists = await this.app.vault.adapter.exists(
        this.settings.recordFilePath
      );
      if (recordFileExists) {
        const content = await this.app.vault.adapter.read(
          this.settings.recordFilePath
        );
        const data = JSON.parse(content);

        // Convert the plain objects back to Map entries
        this.records = new Map(
          Object.entries(data).map(([hash, record]) => {
            // Restore TFile reference as null since it can't be serialized
            return [hash, { ...record as FileRecord, file: null } as FileRecord];
          })
        );
      }
    } catch (error) {
      console.warn("Failed to load records:", error);
      // Initialize with empty Map if loading fails
      this.records = new Map();
    }
  }

  private debounceSave(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => this.saveRecords(), 1000);
  }

  private async saveRecords(): Promise<void> {
    try {
      // Convert Map to a plain object for serialization
      const recordsObj = Object.fromEntries(
        Array.from(this.records.entries()).map(([hash, record]) => {
          // Create a copy without the TFile reference
          const { file, ...recordWithoutFile } = record;
          return [hash, recordWithoutFile];
        })
      );

      const content = JSON.stringify(recordsObj, null, 2);

      // Ensure parent directory exists
      const dirPath = this.settings.recordFilePath
        .split("/")
        .slice(0, -1)
        .join("/");
      if (dirPath) {
        await this.app.vault.adapter.mkdir(dirPath);
      }

      // Write or create the file
      const recordFileExists = await this.app.vault.adapter.exists(
        this.settings.recordFilePath
      );

      if (recordFileExists) {
        await this.app.vault.adapter.write(
          this.settings.recordFilePath,
          content
        );
      } else {
        await this.app.vault.create(this.settings.recordFilePath, content);
      }
    } catch (error) {
      console.error("Failed to save records:", error);
    }
  }

  public startTracking(hash: string, originalName: string): string {
    if (!this.records.has(hash)) {
      this.records.set(hash, {
        id: hash,
        file: null,
        tags: [],
        formatted: false,
        logs: {} as Record<Action, LogEntry>,
        status: "queued",
        originalName,
      });
    }
    this.debounceSave();
    return hash;
  }

  public setStatus(hash: string, status: FileStatus): void {
    const record = this.records.get(hash);
    if (record) {
      record.status = status;
      this.debounceSave();
    }
  }

  public completeAction(hash: string, step: Action): void {
    this.addAction(hash, step, true);
  }
  public skipAction(hash: string, step: Action): void {
    this.addAction(hash, step, false, true);
  }

  public addAction(
    hash: string,
    step: Action,
    completed = false,
    skipped = false
  ): void {
    const record = this.records.get(hash);
    if (record) {
      // For completed actions, find and update the corresponding in-progress action
      if (completed) {
        // If this is a _DONE action, find the corresponding base action
        const baseAction = this.getBaseAction(step);
        if (baseAction && record.logs[baseAction]) {
          record.logs[baseAction].completed = true;
          this.debounceSave();
          return;
        }
      }

      // For new actions, add them as in-progress or skipped
      record.logs[step] = {
        timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
        completed,
        skipped,
      };
      this.debounceSave();
    }
  }

  public addTag(hash: string, tag: string): void {
    const record = this.records.get(hash);
    if (record && !record.tags.includes(tag)) {
      record.tags.push(tag);
      this.debounceSave();
    }
  }

  public setFile(hash: string, file: TFile): void {
    const record = this.records.get(hash);
    if (record) {
      record.file = file;
    }
  }

  public setClassification(hash: string, classification: string): void {
    const record = this.records.get(hash);
    if (record) {
      record.classification = classification;
      this.debounceSave();
    }
  }

  public setFormatted(hash: string, formatted: boolean): void {
    const record = this.records.get(hash);
    if (record) {
      record.formatted = formatted;
      this.debounceSave();
    }
  }

  public setNewPath(hash: string, newPath: string): void {
    const record = this.records.get(hash);
    if (record) {
      record.newPath = newPath;
      this.debounceSave();
    }
  }

  public setNewName(hash: string, newName: string): void {
    const record = this.records.get(hash);
    if (record) {
      record.newName = newName;
      this.debounceSave();
    }
  }

  public setTags(hash: string, tags: string[]): void {
    const record = this.records.get(hash);
    if (record) {
      record.tags = tags;
      this.debounceSave();
    }
  }

  public setFolder(hash: string, folder: string): void {
    const record = this.records.get(hash);
    if (record) {
      record.newPath = folder;
      this.debounceSave();
    }
  }

  // Logging methods
  // Query methods
  public getRecord(hash: string): FileRecord | undefined {
    return this.records.get(hash);
  }

  public hasErrors(hash: string, step?: Action): boolean {
    const record = this.records.get(hash);
    if (!record) return false;

    if (step) {
      return !!record.logs[step]?.error;
    }

    return Object.values(record.logs).some(log => !!log.error);
  }

  public getStepLogs(hash: string, step: Action): LogEntry | undefined {
    const record = this.records.get(hash);
    if (!record) return undefined;
    return record.logs[step];
  }

  public getLastStep(hash: string): Action | null {
    const record = this.records.get(hash);
    if (!record) return null;

    const steps = Object.entries(record.logs);
    if (steps.length === 0) return null;

    return steps.reduce((latest, [action, log]) => {
      if (
        !latest ||
        moment(log.timestamp).isAfter(moment(record.logs[latest].timestamp))
      ) {
        return action as Action;
      }
      return latest;
    }, null as Action | null);
  }

  // Query methods for multiple records
  public getAllRecords(): FileRecord[] {
    return Array.from(this.records.values());
  }

  public getRecordsWithErrors(): FileRecord[] {
    return this.getAllRecords().filter(record =>
      Object.values(record.logs).some(log => !!log.error)
    );
  }

  public getRecordsByStep(step: Action): FileRecord[] {
    return this.getAllRecords().filter(record => !!record.logs[step]);
  }

  public addError(
    hash: string,
    error: { action: Action; message: string; stack?: string }
  ): void {
    const record = this.records.get(hash);
    if (record) {
      record.logs[error.action] = {
        timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
        completed: false,
        error: {
          message: error.message,
          stack: error.stack,
          action: error.action,
        },
      };
      this.debounceSave();
    }
  }

  public getStepErrors(
    hash: string
  ): Array<{ action: Action; error: LogEntry["error"] }> {
    const record = this.records.get(hash);
    if (!record) return [];

    return Object.entries(record.logs)
      .filter(([_, log]) => log.error)
      .map(([action, log]) => ({
        action: action as Action,
        error: log.error,
      }));
  }

  public getLastError(
    hash: string
  ): { action: Action; error: LogEntry["error"] } | null {
    const errors = this.getStepErrors(hash);
    return errors.length > 0 ? errors[errors.length - 1] : null;
  }

  private getBaseAction(completedStep: Action): Action | undefined {
    const reverseMap: Partial<Record<Action, Action>> = {
      [Action.CLEANUP_DONE]: Action.CLEANUP,
      [Action.RENAME_DONE]: Action.RENAME,
      [Action.EXTRACT_DONE]: Action.EXTRACT,
      [Action.MOVING_ATTACHEMENT_DONE]: Action.MOVING_ATTACHMENT,
      [Action.CLASSIFY_DONE]: Action.CLASSIFY,
      [Action.TAGGING_DONE]: Action.TAGGING,
      [Action.APPLYING_TAGS_DONE]: Action.APPLYING_TAGS,
      [Action.RECOMMEND_NAME_DONE]: Action.RECOMMEND_NAME,
      [Action.APPLYING_NAME_DONE]: Action.APPLYING_NAME,
      [Action.FORMATTING_DONE]: Action.FORMATTING,
      [Action.MOVING_DONE]: Action.MOVING,
      [Action.VALIDATE_DONE]: Action.VALIDATE,
      [Action.CONTAINER_DONE]: Action.CONTAINER,
      [Action.APPEND_DONE]: Action.APPEND,
      [Action.FETCH_YOUTUBE_DONE]: Action.FETCH_YOUTUBE,
    };
    return reverseMap[completedStep];
  }
}
