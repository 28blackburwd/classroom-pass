"use strict";

const STORAGE_KEY = "classroom-pass-state";
const starterStudents = ["Avery Johnson", "Jordan Lee", "Sam Taylor"];
const reasons = ["Restroom", "Nurse", "Water", "Other"];
const appState = loadState();
let activeMode = "student";
let noticeMessage = "";
let selectedStudentName = "";

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function createInitialState() {
  return {
    students: starterStudents.map((name) => ({
      id: createId("student"),
      name,
      role: "student"
    })),
    passes: []
  };
}

function isValidState(value) {
  return value !== null
    && typeof value === "object"
    && Array.isArray(value.students)
    && Array.isArray(value.passes)
    && value.students.every((student) =>
      student
      && typeof student.id === "string"
      && typeof student.name === "string"
      && student.role === "student"
    )
    && value.passes.every((passRecord) =>
      passRecord
      && typeof passRecord.id === "string"
      && typeof passRecord.studentId === "string"
      && typeof passRecord.studentName === "string"
      && typeof passRecord.reason === "string"
      && ["pending", "approved", "denied", "returned", "missing"].includes(passRecord.status)
      && typeof passRecord.requestedAt === "string"
      && (passRecord.approvedAt === null || typeof passRecord.approvedAt === "string")
      && (passRecord.returnedAt === null || typeof passRecord.returnedAt === "string")
      && (passRecord.returnConfirmedAt === null || typeof passRecord.returnConfirmedAt === "string")
      && (passRecord.missingAt === undefined || passRecord.missingAt === null || typeof passRecord.missingAt === "string")
      && typeof passRecord.notes === "string"
    );
}

function loadState() {
  const initialState = createInitialState();
  try {
    const savedValue = localStorage.getItem(STORAGE_KEY);
    if (savedValue === null) {
      return initialState;
    }
    const parsedValue = JSON.parse(savedValue);
    if (!isValidState(parsedValue)) {
      noticeMessage = "Saved app data is invalid. A fresh student list is ready; your existing browser data was not changed.";
      return initialState;
    }
    return parsedValue;
  } catch (error) {
    noticeMessage = error instanceof SyntaxError
      ? "Saved app data could not be read. A fresh student list is ready; your existing browser data was not changed."
      : "Browser storage is unavailable. Changes may not be saved after you close or refresh this page.";
    return initialState;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    noticeMessage = "";
    return true;
  } catch {
    noticeMessage = "Your change is visible for now, but the browser could not save it. Check your browser's storage settings.";
    renderApp();
    return false;
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatDate(dateString) {
  if (!dateString) {
    return "—";
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function sortedPasses(passes) {
  return [...passes].sort((first, second) =>
    new Date(second.requestedAt).getTime() - new Date(first.requestedAt).getTime()
  );
}

function getStudentByName(name) {
  const normalizedName = name.trim().toLocaleLowerCase();
  return appState.students.find((student) =>
    student.name.trim().toLocaleLowerCase() === normalizedName
  );
}

function statusLabel(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusPill(status) {
  return `<span class="status-pill status-${escapeHTML(status)}">${escapeHTML(statusLabel(status))}</span>`;
}

function renderNotice() {
  const notice = document.getElementById("notice");
  notice.textContent = noticeMessage;
  notice.hidden = !noticeMessage;
}

function renderStudentView() {
  const studentView = document.getElementById("student-view");
  const knownNames = [...new Set(appState.students.map((student) => student.name))]
    .sort((first, second) => first.localeCompare(second));
  const nameOptions = knownNames.map((name) =>
    `<option value="${escapeHTML(name)}"></option>`
  ).join("");

  studentView.innerHTML = `
    <div class="page-heading">
      <p class="eyebrow">Student space</p>
      <h1 id="student-heading">Need to step out?</h1>
      <p>Send a quick request and wait for your teacher's okay.</p>
    </div>
    <div class="student-layout">
      <section class="card request-card" aria-labelledby="request-heading">
        <h2 id="request-heading">Request a pass</h2>
        <p class="card-intro">Your teacher will see your request as soon as you send it.</p>
        <form id="request-form">
          <label class="field" for="student-name">
            <span class="field-label">Your name</span>
            <input id="student-name" name="studentName" list="student-names" maxlength="60" autocomplete="name" placeholder="Choose or type your name" required>
            <datalist id="student-names">${nameOptions}</datalist>
            <span class="field-hint">Start typing to choose a name, or enter yours.</span>
          </label>
          <label class="field" for="pass-reason">
            <span class="field-label">Reason <span class="optional-note">(optional)</span></span>
            <select id="pass-reason" name="reason">
              <option value="">Choose a reason</option>
              ${reasons.map((reason) => `<option value="${escapeHTML(reason)}">${escapeHTML(reason)}</option>`).join("")}
            </select>
          </label>
          <button class="button button-primary button-full" id="request-button" type="submit">Request Restroom Pass</button>
        </form>
      </section>
      <div class="student-side">
        <section class="card status-card" id="student-status" aria-live="polite"></section>
        <aside class="card tip-card">
          <span class="tip-icon" aria-hidden="true">i</span>
          <h3>Remember</h3>
          <p>Wait for your teacher to approve your request before leaving the classroom.</p>
        </aside>
      </div>
    </div>
    <section class="card history-panel" aria-labelledby="student-history-heading">
      <div class="panel-heading">
        <div>
          <h2 id="student-history-heading">Your recent passes</h2>
          <p>Passes for the name entered above.</p>
        </div>
      </div>
      <div class="history-list" id="student-history"></div>
    </section>
  `;

  const form = document.getElementById("request-form");
  const studentNameInput = document.getElementById("student-name");
  studentNameInput.value = selectedStudentName;
  form.addEventListener("submit", submitPassRequest);
  studentNameInput.addEventListener("input", () => {
    selectedStudentName = studentNameInput.value;
    renderStudentStatus();
  });
  studentNameInput.addEventListener("input", renderStudentHistory);
  renderStudentStatus();
  renderStudentHistory();
}

function renderStudentStatus() {
  const statusCard = document.getElementById("student-status");
  const nameInput = document.getElementById("student-name");
  if (!statusCard || !nameInput) {
    return;
  }
  const student = getStudentByName(nameInput.value);
  const latestPass = student
    ? sortedPasses(appState.passes.filter((passRecord) => passRecord.studentId === student.id))[0]
    : null;
  const hasOpenPass = latestPass && (
    latestPass.status === "pending"
    || latestPass.status === "approved"
    || latestPass.status === "missing"
    || (latestPass.status === "returned" && latestPass.returnConfirmedAt === null)
  );

  let statusMarkup = `
    <p class="panel-kicker">Current pass</p>
    <h2>${student ? "No active request" : "Your status"}</h2>
    <p class="status-message">${student ? "When you request a pass, its status will appear here." : "Enter your name to see your pass status."}</p>
  `;

  if (latestPass) {
    let message = "Your request is waiting for your teacher.";
    if (latestPass.status === "approved") {
      message = "Your teacher approved your pass. You may leave now.";
    } else if (latestPass.status === "missing") {
      message = "Your teacher marked this pass as missing. Please check in with your teacher as soon as you return.";
    } else if (latestPass.status === "denied") {
      message = "Your request was declined. Please check with your teacher if you have questions.";
    } else if (latestPass.status === "returned") {
      message = latestPass.returnConfirmedAt
        ? "You're checked back in. Your teacher confirmed your return."
        : "You're marked as back. Your teacher will confirm your return.";
    }

    statusMarkup = `
      <p class="panel-kicker">Current pass</p>
      <h2>${escapeHTML(latestPass.reason || "Pass request")}</h2>
      ${statusPill(latestPass.status)}
      <p class="status-message">${message}</p>
      <p class="status-detail">Requested ${formatDate(latestPass.requestedAt)}</p>
      ${latestPass.status === "approved" || latestPass.status === "missing" ? '<button class="button button-success button-full" type="button" data-action="student-return">I’m Back</button>' : ""}
      ${latestPass.status === "returned" && !latestPass.returnConfirmedAt ? '<p class="status-detail">Waiting for teacher confirmation</p>' : ""}
    `;
  }

  statusCard.innerHTML = statusMarkup;
  const returnButton = statusCard.querySelector('[data-action="student-return"]');
  if (returnButton) {
    returnButton.addEventListener("click", () => markReturned(latestPass.id, false));
  }
  const requestButton = document.getElementById("request-button");
  if (requestButton) {
    requestButton.disabled = Boolean(hasOpenPass);
    requestButton.textContent = hasOpenPass ? "You already have an active pass" : "Request Restroom Pass";
  }
}

function renderStudentHistory() {
  const historyList = document.getElementById("student-history");
  const nameInput = document.getElementById("student-name");
  if (!historyList || !nameInput) {
    return;
  }
  const student = getStudentByName(nameInput.value);
  const studentPasses = student
    ? sortedPasses(appState.passes.filter((passRecord) => passRecord.studentId === student.id))
      .filter((passRecord) =>
        passRecord.status === "denied"
        || (passRecord.status === "returned" && passRecord.returnConfirmedAt !== null)
      )
      .slice(0, 5)
    : [];

  historyList.innerHTML = studentPasses.length
    ? studentPasses.map((passRecord) => `
      <article class="history-row">
        <div>
          <strong>${escapeHTML(passRecord.reason || "Pass request")}</strong>
          <small>${formatDate(passRecord.requestedAt)}</small>
        </div>
        ${statusPill(passRecord.status)}
      </article>
    `).join("")
    : '<div class="empty-state">Your completed passes will show up here.</div>';
}

function renderTeacherView() {
  const teacherView = document.getElementById("teacher-view");
  const passes = sortedPasses(appState.passes);
  const pendingPasses = passes.filter((passRecord) => passRecord.status === "pending");
  const activePasses = passes.filter((passRecord) =>
    passRecord.status === "approved"
    || passRecord.status === "missing"
    || (passRecord.status === "returned" && passRecord.returnConfirmedAt === null)
  );
  const recentCompletedPasses = passes.filter((passRecord) =>
    passRecord.status === "denied"
    || (passRecord.status === "returned" && passRecord.returnConfirmedAt !== null)
  ).slice(0, 10);
  const historyPasses = passes.filter((passRecord) =>
    passRecord.status === "missing" || recentCompletedPasses.includes(passRecord)
  );
  const outCount = passes.filter((passRecord) => passRecord.status === "approved").length;
  const missingCount = passes.filter((passRecord) => passRecord.status === "missing").length;

  teacherView.innerHTML = `
    <div class="teacher-heading">
      <div class="page-heading">
        <p class="eyebrow">Teacher dashboard</p>
        <h1 id="teacher-heading">Pass overview</h1>
        <p>Review requests and keep track of students who are out.</p>
      </div>
      <span class="teacher-date">${new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</span>
    </div>
    <div class="stat-grid" aria-label="Pass summary">
      <article class="card stat-card">
        <p class="stat-label">Waiting for approval</p>
        <p class="stat-value">${pendingPasses.length}</p>
        <p class="stat-footnote">Pending requests</p>
      </article>
      <article class="card stat-card">
        <p class="stat-label">Currently out</p>
        <p class="stat-value">${outCount}</p>
        <p class="stat-footnote">Approved passes</p>
      </article>
      <article class="card stat-card">
        <p class="stat-label">Marked missing</p>
        <p class="stat-value stat-warning">${missingCount}</p>
        <p class="stat-footnote">Needs teacher follow-up</p>
      </article>
      <article class="card stat-card">
        <p class="stat-label">Needs confirmation</p>
        <p class="stat-value">${passes.filter((passRecord) => passRecord.status === "returned" && passRecord.returnConfirmedAt === null).length}</p>
        <p class="stat-footnote">Students marked back</p>
      </article>
    </div>
    <section class="card teacher-section" aria-labelledby="pending-heading">
      <div class="panel-heading">
        <div>
          <h2 id="pending-heading">Pending requests</h2>
          <p>Approve a request before a student leaves.</p>
        </div>
        <span class="section-count" aria-label="${pendingPasses.length} pending">${pendingPasses.length}</span>
      </div>
      <div class="request-list">
        ${pendingPasses.length ? pendingPasses.map((passRecord) => renderTeacherPass(passRecord, "pending")).join("") : '<div class="empty-state">No requests waiting right now.</div>'}
      </div>
    </section>
    <section class="card teacher-section" aria-labelledby="active-heading">
      <div class="panel-heading">
        <div>
          <h2 id="active-heading">Active passes</h2>
          <p>Students out now and returns waiting for confirmation.</p>
        </div>
        <span class="section-count" aria-label="${activePasses.length} active">${activePasses.length}</span>
      </div>
      <div class="request-list">
        ${activePasses.length ? activePasses.map((passRecord) => renderTeacherPass(passRecord, "active")).join("") : '<div class="empty-state">No students are currently out.</div>'}
      </div>
    </section>
    <section class="card teacher-section" aria-labelledby="history-heading">
      <div class="panel-heading">
        <div>
          <h2 id="history-heading">Recent pass history</h2>
          <p>Recent denied requests, missing passes, and confirmed returns.</p>
        </div>
        <span class="section-count" aria-label="${historyPasses.length} recent">${historyPasses.length}</span>
      </div>
      ${historyPasses.length ? `
        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr><th>Student</th><th>Reason</th><th>Requested</th><th>Status</th><th>Returned / flagged</th></tr>
            </thead>
            <tbody>
              ${historyPasses.map((passRecord) => `
                <tr>
                  <td>${escapeHTML(passRecord.studentName)}</td>
                  <td>${escapeHTML(passRecord.reason || "—")}</td>
                  <td>${formatDate(passRecord.requestedAt)}</td>
                  <td>${statusPill(passRecord.status)}</td>
                  <td>${formatDate(passRecord.returnedAt || passRecord.missingAt)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : '<div class="empty-state history-empty">Completed passes will appear here.</div>'}
    </section>
  `;

  teacherView.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const { action, passId } = button.dataset;
      if (action === "approve") {
        approvePass(passId);
      } else if (action === "deny") {
        denyPass(passId);
      } else if (action === "confirm-return") {
        markReturned(passId, true);
      } else if (action === "teacher-return") {
        markReturned(passId, true);
      } else if (action === "mark-missing") {
        markMissing(passId);
      }
    });
  });
}

function renderTeacherPass(passRecord, section) {
  const isAwaitingConfirmation = passRecord.status === "returned" && passRecord.returnConfirmedAt === null;
  let actions = "";
  if (section === "pending") {
    actions = `
      <div class="pass-actions">
        <button class="button button-primary" type="button" data-action="approve" data-pass-id="${escapeHTML(passRecord.id)}">Approve</button>
        <button class="button button-danger" type="button" data-action="deny" data-pass-id="${escapeHTML(passRecord.id)}">Deny</button>
      </div>
    `;
  } else if (isAwaitingConfirmation) {
    actions = `<div class="pass-actions"><button class="button button-success" type="button" data-action="confirm-return" data-pass-id="${escapeHTML(passRecord.id)}">Confirm return</button></div>`;
  } else if (passRecord.status === "approved") {
    actions = `
      <div class="pass-actions">
        <button class="button button-secondary" type="button" data-action="teacher-return" data-pass-id="${escapeHTML(passRecord.id)}">Mark returned</button>
        <button class="button button-missing" type="button" data-action="mark-missing" data-pass-id="${escapeHTML(passRecord.id)}">Mark missing</button>
      </div>
    `;
  } else if (passRecord.status === "missing") {
    actions = `<div class="pass-actions"><button class="button button-success" type="button" data-action="teacher-return" data-pass-id="${escapeHTML(passRecord.id)}">Confirm returned</button></div>`;
  }

  return `
    <article class="pass-row${passRecord.status === "missing" ? " pass-row-missing" : ""}">
      <div class="pass-main">
        <div class="pass-title-line">
          <strong>${escapeHTML(passRecord.studentName)}</strong>
          ${statusPill(isAwaitingConfirmation ? "returned" : passRecord.status)}
        </div>
        <div class="pass-meta">
          <span>${escapeHTML(passRecord.reason || "No reason given")}</span>
          <span>Requested ${formatDate(passRecord.requestedAt)}</span>
          ${passRecord.approvedAt ? `<span>Approved ${formatDate(passRecord.approvedAt)}</span>` : ""}
          ${passRecord.returnedAt ? `<span>Back ${formatDate(passRecord.returnedAt)}</span>` : ""}
          ${passRecord.missingAt ? `<span>Marked missing ${formatDate(passRecord.missingAt)}</span>` : ""}
        </div>
        ${isAwaitingConfirmation ? '<p class="pass-notes">Student reported they are back; confirm to archive this pass.</p>' : ""}
        ${passRecord.status === "missing" ? '<p class="pass-notes missing-note">Follow up with this student. This pass stays active until their return is confirmed.</p>' : ""}
      </div>
      ${actions}
    </article>
  `;
}

function renderApp() {
  renderNotice();
  renderStudentView();
  renderTeacherView();
  const isStudentMode = activeMode === "student";
  document.getElementById("student-view").hidden = !isStudentMode;
  document.getElementById("teacher-view").hidden = isStudentMode;
  document.querySelectorAll(".mode-button").forEach((button) => {
    const isActive = button.dataset.mode === activeMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function submitPassRequest(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const studentName = String(formData.get("studentName") || "").trim();
  const reason = String(formData.get("reason") || "").trim();
  if (!studentName) {
    document.getElementById("student-name").focus();
    return;
  }

  let student = getStudentByName(studentName);
  if (!student) {
    student = { id: createId("student"), name: studentName, role: "student" };
    appState.students.push(student);
  }

  const hasOpenPass = appState.passes.some((passRecord) =>
    passRecord.studentId === student.id
    && (
      passRecord.status === "pending"
      || passRecord.status === "approved"
      || passRecord.status === "missing"
      || (passRecord.status === "returned" && passRecord.returnConfirmedAt === null)
    )
  );
  if (hasOpenPass) {
    noticeMessage = "You already have a request or pass that needs to be completed.";
    renderApp();
    return;
  }

  appState.passes.push({
    id: createId("pass"),
    studentId: student.id,
    studentName: student.name,
    reason,
    status: "pending",
    requestedAt: new Date().toISOString(),
    approvedAt: null,
    returnedAt: null,
    returnConfirmedAt: null,
    missingAt: null,
    notes: ""
  });
  selectedStudentName = student.name;
  saveState();
  renderApp();
}

function findPass(passId, expectedStatus) {
  const passRecord = appState.passes.find((item) => item.id === passId);
  if (!passRecord || passRecord.status !== expectedStatus) {
    return null;
  }
  return passRecord;
}

function approvePass(passId) {
  const passRecord = findPass(passId, "pending");
  if (!passRecord) {
    noticeMessage = "That request is no longer pending. The dashboard has been refreshed.";
    renderApp();
    return;
  }
  passRecord.status = "approved";
  passRecord.approvedAt = new Date().toISOString();
  saveState();
  renderApp();
}

function denyPass(passId) {
  const passRecord = findPass(passId, "pending");
  if (!passRecord) {
    noticeMessage = "That request is no longer pending. The dashboard has been refreshed.";
    renderApp();
    return;
  }
  passRecord.status = "denied";
  saveState();
  renderApp();
}

function markReturned(passId, teacherConfirmed) {
  const passRecord = appState.passes.find((item) => item.id === passId);
  if (!passRecord) {
    noticeMessage = "That pass could not be found. The dashboard has been refreshed.";
    renderApp();
    return;
  }

  const now = new Date().toISOString();
  if (teacherConfirmed && (passRecord.status === "approved" || passRecord.status === "missing")) {
    passRecord.status = "returned";
    passRecord.returnedAt = now;
    passRecord.returnConfirmedAt = now;
  } else if (teacherConfirmed && passRecord.status === "returned" && passRecord.returnConfirmedAt === null) {
    passRecord.returnConfirmedAt = now;
  } else if (!teacherConfirmed && (passRecord.status === "approved" || passRecord.status === "missing")) {
    passRecord.status = "returned";
    passRecord.returnedAt = now;
  } else {
    noticeMessage = "This pass has already been completed or its status has changed.";
    renderApp();
    return;
  }

  saveState();
  renderApp();
}

function markMissing(passId) {
  const passRecord = findPass(passId, "approved");
  if (!passRecord) {
    noticeMessage = "Only an approved active pass can be marked missing.";
    renderApp();
    return;
  }
  passRecord.status = "missing";
  passRecord.missingAt = new Date().toISOString();
  saveState();
  renderApp();
}

document.querySelectorAll(".mode-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeMode = button.dataset.mode;
    renderApp();
  });
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) {
    return;
  }
  if (event.newValue === null) {
    noticeMessage = "Saved app data was cleared in another tab. Reload this page to start with a fresh list.";
    renderNotice();
    return;
  }
  try {
    const newState = JSON.parse(event.newValue);
    if (!isValidState(newState)) {
      noticeMessage = "App data changed in another tab but could not be read.";
      renderNotice();
      return;
    }
    appState.students = newState.students;
    appState.passes = newState.passes;
    noticeMessage = "";
    renderApp();
  } catch {
    noticeMessage = "App data changed in another tab but could not be read.";
    renderNotice();
  }
});

renderApp();
