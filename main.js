// .github/actions/grafana-annotate/main.js
const core = require('@actions/core');
const github = require('@actions/github');
const { getCurrentTimeMs, makeGrafanaApiRequest } = require('./utils');

/**
 * The main function that runs when the action is called.
 * It creates the initial Grafana annotation and saves its ID for the post action.
 */
async function run() {
    try {
        const grafanaUrl = core.getInput('grafana_url', { required: true });
        const grafanaApiKey = core.getInput('grafana_api_key', { required: true });
        const dashboardId = core.getInput('dashboard_id');
        const panelId = core.getInput('panel_id');
        const customMessage = core.getInput('message');
        const customTags = core.getInput('tags');
        const commitSha = core.getInput('commit_sha');
        const runId = core.getInput('run_id');
        const repository = core.getInput('repository');
        const actor = core.getInput('actor');

        // Ensure Grafana URL ends without a slash for consistent path concatenation
        const baseUrl = grafanaUrl.endsWith('/') ? grafanaUrl.slice(0, -1) : grafanaUrl;
        const annotationsApiUrl = `${baseUrl}/api/annotations`;

        const startTimeMs = getCurrentTimeMs();

        // Construct the annotation message
        const message = customMessage || github.context.payload.head_commit?.message || commitSha;
        const tags = customTags || 'deployment,github-actions';

        const annotationPayload = {
            time: startTimeMs, // Set initial time
            tags: tags.split(',').map(tag => tag.trim()), // Grafana expects array of strings for tags
            text: `Deployment by ${actor} (repo: ${repository}, run: #${runId}, commit: ${commitSha}): ${message}`,
            isRegion: true, // Mark as a region to allow for timeEnd later
        };

        if (dashboardId) {
            annotationPayload.dashboardId = parseInt(dashboardId, 10);
            if (panelId) {
                annotationPayload.panelId = parseInt(panelId, 10);
            }
        }

        core.info('Attempting to create Grafana annotation (start time)...');
        core.debug(`Payload: ${JSON.stringify(annotationPayload, null, 2)}`);

        const result = await makeGrafanaApiRequest(annotationsApiUrl, 'POST', annotationPayload, grafanaApiKey);

        if (result.success && result.body && result.body.id) {
            const annotationId = result.body.id;
            core.info(`✔ Successfully created annotation with ID: ${annotationId}`);
            core.setOutput('annotation_id', annotationId);

            // Save all necessary inputs and the annotation ID to state for the post action
            core.saveState('annotation_id', annotationId);
            core.saveState('start_time_ms', startTimeMs);
            core.saveState('grafana_url', grafanaUrl);
            core.saveState('grafana_api_key', grafanaApiKey);
            core.saveState('dashboard_id', dashboardId);
            core.saveState('panel_id', panelId);
            core.saveState('message', message);
            core.saveState('tags', tags);
            core.saveState('commit_sha', commitSha);
            core.saveState('run_id', runId);
            core.saveState('repository', repository);
            core.saveState('actor', actor);

        } else {
            core.setFailed(`✖ Failed to create Grafana annotation: ${result.body ? JSON.stringify(result.body) : 'No response body'}`);
        }

    } catch (error) {
        core.setFailed(`Action failed during main execution: ${error.message}`);
    }
}

// Call the main function
run();
