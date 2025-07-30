// .github/actions/grafana-annotate/post.js
const core = require('@actions/core');
const { makeGrafanaApiRequest } = require('./utils');

/**
 * The post function that runs after all job steps.
 * It retrieves the saved annotation ID and updates the annotation with the end time.
 */
async function post() {
    try {
        const annotationId = core.getState('annotation_id');
        const grafanaUrl = core.getState('grafana_url');
        const grafanaApiKey = core.getState('grafana_api_key');

        if (!annotationId) {
            core.info('No annotation ID found in state. Skipping post-deployment update.');
            return;
        }

        const annotationsApiUrl = `${grafanaUrl}/api/annotations/${annotationId}`;

        const updatedAnnotationPayload = {
            timeEnd: Date.now(),
        };

        core.info(`Attempting to update Grafana annotation (ID: ${annotationId}) with end time...`);
        core.debug(`Payload: ${JSON.stringify(updatedAnnotationPayload, null, 2)}`);

        const result = await makeGrafanaApiRequest(annotationsApiUrl, 'PATCH', updatedAnnotationPayload, grafanaApiKey);

        if (result.success) {
            core.info(`✔ Successfully updated annotation ID: ${annotationId} with end time.`);
        } else {
            core.error(`✖ Failed to update annotation ID: ${annotationId}. HTTP Status: ${result.status}. Response: ${JSON.stringify(result.body)}`);
            // No setFailed here, as it's a post hook and might hide other failures. Just log.
        }

    } catch (error) {
        core.error(`Action failed during post execution: ${error.message}`);
        // No setFailed here
    }
}

post();
