import { css } from 'hono/css';

export const dashboardStyles = css`
  :-hono-global {
    :root {
      color-scheme: light;
      --bg: #f7f8f3;
      --panel: #ffffff;
      --text: #18201b;
      --muted: #647067;
      --line: #d9ded6;
      --accent: #176b5d;
      --accent-strong: #0f4d43;
      --danger: #b42318;
      --warn: #9a5b00;
      --shadow: 0 18px 50px rgb(24 32 27 / 10%);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family:
        Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", sans-serif;
    }

    button,
    textarea {
      font: inherit;
    }

    button {
      min-height: 40px;
      border: 0;
      border-radius: 7px;
      cursor: pointer;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .shell {
      width: min(1160px, calc(100% - 32px));
      margin: 0 auto;
      padding: 28px 0 40px;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    h1 {
      margin: 0;
      font-size: 24px;
      line-height: 1.1;
      letter-spacing: 0;
    }

    .status {
      color: var(--muted);
      font-size: 14px;
      min-height: 20px;
      text-align: right;
    }

    .workspace {
      display: grid;
      grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
      gap: 18px;
      align-items: start;
    }

    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
    }

    .composer {
      padding: 16px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }

    textarea {
      width: 100%;
      min-height: 220px;
      resize: vertical;
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 12px;
      color: var(--text);
      background: #fbfcf8;
      line-height: 1.5;
    }

    textarea:focus {
      outline: 3px solid rgb(23 107 93 / 18%);
      border-color: var(--accent);
    }

    .composer-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 12px;
    }

    .count {
      color: var(--muted);
      font-size: 13px;
    }

    .primary {
      padding: 0 16px;
      background: var(--accent);
      color: #fff;
      font-weight: 800;
    }

    .primary:hover {
      background: var(--accent-strong);
    }

    .list {
      overflow: hidden;
    }

    .list-head,
    .app-row {
      display: grid;
      grid-template-columns: minmax(150px, 1.2fr) 112px 160px 176px;
      gap: 12px;
      align-items: center;
    }

    .list-head {
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }

    .app-row {
      min-height: 86px;
      padding: 14px;
      border-bottom: 1px solid var(--line);
    }

    .app-row:last-child {
      border-bottom: 0;
    }

    .app-name {
      display: block;
      color: var(--text);
      font-weight: 800;
      text-decoration: none;
      overflow-wrap: anywhere;
    }

    .app-prompt {
      margin-top: 4px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 92px;
      min-height: 30px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
    }

    .badge.running {
      background: #dff3ea;
      color: #116149;
    }

    .badge.stopped {
      background: #fff0cf;
      color: var(--warn);
    }

    .badge.deleted {
      background: #f4d7d3;
      color: var(--danger);
    }

    .timestamp {
      color: var(--muted);
      font-size: 13px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .ghost,
    .danger {
      width: 78px;
      background: #eef2ed;
      color: var(--text);
      font-weight: 800;
    }

    .danger {
      background: #fae5e2;
      color: var(--danger);
    }

    .ghost:hover {
      background: #e0e7de;
    }

    .danger:hover {
      background: #f5cdc8;
    }

    .empty {
      padding: 56px 18px;
      color: var(--muted);
      text-align: center;
    }

    @media (max-width: 860px) {
      .workspace {
        grid-template-columns: 1fr;
      }

      .list-head {
        display: none;
      }

      .app-row {
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .actions {
        justify-content: flex-start;
      }

      .status {
        text-align: left;
      }

      .topbar {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  }
`;
