(doc => {
  const DOCS_SELECTOR = "#docs";
  const RAW_LINK_SELECTOR  = "#view-raw";
  const ENV = [
    {
      selector: "#switch-prod",
      docsURL: "https://raw.githubusercontent.com/wri/fw_contextual_layers/production/docs/fw_contextual_layers.yaml"
    },
    {
      selector: "#switch-staging",
      docsURL: "https://raw.githubusercontent.com/wri/fw_contextual_layers/staging/docs/fw_contextual_layers.yaml"
    },
    {
      selector: "#switch-dev",
      docsURL: "https://raw.githubusercontent.com/wri/fw_contextual_layers/dev/docs/fw_contextual_layers.yaml"
    }
  ];

  let activeSwitch, viewRawLink;
  const activateSwitch = selector => {
    if (activeSwitch) {
      activeSwitch.classList.remove("active");
    }
    activeSwitch = doc.querySelector(selector);
    activeSwitch.classList.add("active");
  };

  const switchDocs = async env => {
    const docs = doc.querySelector(DOCS_SELECTOR);
    activateSwitch(env.selector);
    docs.apiDescriptionDocument = "";
    docs.apiDescriptionDocument = await fetch(env.docsURL).then(res => res.text());
    viewRawLink.href = env.docsURL;
  };

  const init = () => {
    viewRawLink = doc.querySelector(RAW_LINK_SELECTOR);

    ENV.forEach((env) => {
      const switcher = doc.querySelector(env.selector);

      switcher.addEventListener("click", () => {
        switchDocs(env);
      });
    });

    const firstEnv = [...ENV].shift();
    switchDocs(firstEnv);
  };

  doc.addEventListener("DOMContentLoaded", init);
})(document);
