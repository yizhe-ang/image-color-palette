import { useEffect, useRef, useState } from "react";
import Progress from "./Progress";
import { button, useControls } from "leva";
import data from "./data.json";

export const Model = () => {
  const [ready, setReady] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [progressItems, setProgressItems] = useState([]);

  const [embeddings, setEmbeddings] = useState(() => {
    if (localStorage.getItem("embeddings") !== "undefined") {
      return JSON.parse(localStorage.getItem("embeddings"));
    } else {
      return null;
    }
  });

  // Setup worker
  const worker = useRef(null);

  useControls({
    run: button(() => {
      console.log("run");
      setDisabled(true);
      worker.current.postMessage({
        input: data,
      });
    }),
  });

  useEffect(() => {
    console.log(embeddings);
  }, [embeddings]);

  useEffect(() => {
    // Set-up worker
    if (!worker.current) {
      worker.current = new Worker(new URL("./worker.js", import.meta.url), {
        type: "module",
      });
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e) => {
      console.log(e.data);

      const embeddings = JSON.stringify(e.data.output);
      setEmbeddings(embeddings);

      // Save to local storage
      localStorage.setItem("embeddings", embeddings);

      switch (e.data.status) {
        case "initiate":
          // Model file start load: add a new progress item to the list.
          setReady(false);
          setProgressItems((prev) => [...prev, e.data]);
          break;

        case "progress":
          // Model file progress: update one of the progress items.
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, progress: e.data.progress };
              }
              return item;
            })
          );
          break;

        case "done":
          // Model file loaded: remove the progress item from the list.
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file)
          );
          break;

        case "ready":
          // Pipeline ready: the worker is ready to accept messages.
          setReady(true);
          break;

        case "update":
          // Generation update: update the output text.
          setOutput(e.data.output);
          break;

        case "complete":
          // Generation complete: re-enable the "Translate" button
          setDisabled(false);
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener("message", onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => {
      localStorage.removeItem("embeddings");

      worker.current.removeEventListener("message", onMessageReceived);
    };
  }, []);

  return (
    <div className="progress-bars-container fixed left-0 top-0 w-11">
      {ready === false && <label>Loading models... (only run once)</label>}
      {progressItems.map((data) => (
        <div key={data.file}>
          <Progress text={data.file} percentage={data.progress} />
        </div>
      ))}
    </div>
  );
};
