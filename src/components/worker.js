// https://huggingface.co/docs/transformers.js/main/en/tutorials/react

import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
  MobileViTFeatureExtractor,
  RawImage,
  pipeline,
} from "@xenova/transformers";
import { UMAP } from "umap-js";

class FeatureExtractionPipeline {
  static task = "feature-extraction";
  // FIXME: To choose a more appropriate model
  // static model = "aurantium/clip-ViT-B-32-multilingual-v1";
  static model = "Xenova/vit-base-patch16-224-in21k";
  // static model = "Xenova/dino-vitb16"

  static instance = null;
  static processor = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      // this.instance = pipeline(this.task, this.model, { progress_callback });

      this.instance = await CLIPVisionModelWithProjection.from_pretrained(
        "Xenova/clip-vit-base-patch16",
        {
          progress_callback,
        }
      );
      this.processor = await AutoProcessor.from_pretrained(
        "Xenova/clip-vit-base-patch16"
      );
    }

    return [this.instance, this.processor];
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  // Retrieve the pipeline. When called for the first time,
  // this will load the pipeline and save it for future use.
  const [extractor, processor] = await FeatureExtractionPipeline.getInstance(
    (x) => {
      // We also add a progress callback to the pipeline so that we can
      // track model loading.
      self.postMessage(x);

      console.log(x);
    }
  );

  // Perform pipeline
  // Single
  // const image = await RawImage.read(`/${event.data.input[0]}`);
  // const imageInputs = await processor(image);
  // const outputs = await extractor(imageInputs)
  // const embeddings = outputs.image_embeds.data

  // TODO: Parallel
  // https://github.com/xenova/transformers.js/issues/424
  // const images = await Promise.all(
  //   event.data.input.map((i) => RawImage.read(`/${i}`))
  // );
  // const outputs = await extractor(images)

  // Sequential
  // const embeddings = await Promise.all(
  //   event.data.input.slice(0, 1).map(async (i) => {
  //     const image = await RawImage.read(`/${i}`);
  //     const input = await processor(image);
  //     const output = await extractor(input);

  //     return output.image_embeds.data;
  //   })
  // );

  const start = performance.now();
  const embeddings = await Promise.all(
    event.data.input.map(async (i) => {
      const image = await RawImage.read(`/${i}`);
      const input = await processor(image);
      const output = await extractor(input);

      return output.image_embeds.data;
    })
  );
  const end = performance.now();
  console.log("time", (end - start) / 1000);

  // TODO: Perform UMAP here too?
  const umap2d = new UMAP({
    nComponents: 2,
  });
  const embeddings2d = await umap2d.fitAsync(embeddings);

  const umap3d = new UMAP({
    nComponents: 3,
  });
  const embeddings3d = await umap3d.fitAsync(embeddings);

  const results = {
    embeddings2d,
    embeddings3d,
  };

  console.log(results);

  // TODO: Save to localStorage

  // Send the output back to the main thread
  self.postMessage({
    status: "complete",
    output: results,
  });
});
