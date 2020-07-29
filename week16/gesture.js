let element = document.body;

function enableGesture(element) {
  let contexts = Object.create(null);

  let MOUSE_SYMOBL = Symbol("mouse");

  // 禁止PC上的touch事件
  if (document.ontouchstart !== null) {
    element.addEventListener("mousedown", (event) => {
      if (event.which === 1) {
        contexts[MOUSE_SYMOBL] = Object.create(null);
        start(event, contexts[MOUSE_SYMOBL]);

        let mousemove = (event) => {
          move(event, contexts[MOUSE_SYMOBL]);
        };
        let mouseend = (event) => {
          end(event, contexts[MOUSE_SYMOBL]);
          document.removeEventListener("mousemove", mousemove);
          document.removeEventListener("mouseup", mouseend);
        };
        document.addEventListener("mousemove", mousemove);
        document.addEventListener("mouseup", mouseend);
      }
    });
  }

  element.addEventListener("touchstart", (event) => {
    for (let touch of event.changedTouches) {
      contexts[touch.identifier] = Object.create(null);
      start(touch, contexts[touch.identifier]);
    }
  });

  element.addEventListener("touchmove", (event) => {
    for (let touch of event.changedTouches) {
      // contexts[touch.identifier] = Object.create(null);
      move(touch, contexts[touch.identifier]);
    }
  });

  element.addEventListener("touchend", (event) => {
    for (let touch of event.changedTouches) {
      // contexts[touch.identifier] = Object.create(null);
      end(touch, contexts[touch.identifier]);
      delete contexts[touch.identifier];
    }
  });

  element.addEventListener("touchcancel", (event) => {
    for (let touch of event.changedTouches) {
      contexts[touch.identifier] = Object.create(null);
      cancel(touch, contexts[touch.identifier]);
      delete contexts[touch.identifier];
    }
  });

  /*
tap
pan - panStart panMove panEnd
flick
press
 */
  // let flickTime = null;

  let start = (point, context) => {

    element.dispatchEvent(new CustomEvent('start', {
      detail: {
        startX: context.startX,
        startY: context.startY,
        clientX: point.clientX,
        clientY: point.clientY,
      }
    }));

    // flickTime = Date.now();
    context.startX = point.clientX;
    context.startY = point.clientY;

    context.moves = [];

    context.isTap = true;
    context.isPan = false;
    context.isPress = false;
    console.log("start");

    context.timeoutHandler = setTimeout(() => {
      if (context.isPan) return;

      context.isTap = false;
      context.isPan = false;
      context.isPress = true;
      console.log("press start");
      element.dispatchEvent(new CustomEvent('pressStart', {
        detail: {
          startX: context.startX,
          startY: context.startY,
          clientX: point.clientX,
          clientY: point.clientY,
        }
      }));
    }, 500);
    // console.log('start', point.clientX, point.clientY);
  };
  let move = (point, context) => {
    let dx = point.clientX - context.startX;
    let dy = point.clientY - context.startY;

    if (dx ** 2 + dy ** 2 > 100 && !context.isPan) {
      // 10px 的距离，作为触发的条件
      context.isTap = false;
      context.isPan = true;
      context.isPress = false;
      console.log("pan start");
      element.dispatchEvent(new CustomEvent('panStart', {
        detail: {
          startX: context.startX,
          startY: context.startY,
          clientX: point.clientX,
          clientY: point.clientY,
        }
      }));
    }

    if (context.isPan) {
      // TODO: Flick
      // let now = Date.now();
      // let speed = Math.sqrt(dx **2 + dy ** 2) / (now - flickTime)
      // // console.log(speed, 'speed')
      // if (speed > 5) {
      //   console.log('flick')
      // }

      context.moves.push({ dx, dy, time: Date.now() });

      context.moves = context.moves.filter((record) => {
        return Date.now() - record.time < 300;
      });

      element.dispatchEvent(new CustomEvent('panMove', {
        detail: {
          startX: context.startX,
          startY: context.startY,
          clientX: point.clientX,
          clientY: point.clientY,
        }
      }));
      console.log("pan");
    }

    // console.log('move', dx, dy);
  };
  let end = (point, context) => {
    let dx = point.clientX - context.startX;
    let dy = point.clientY - context.startY;

    if (context.isPan) {
      let record = context.moves[0];
      let speed =
        Math.sqrt((record.dx - dx) ** 2 + (record.dy - dy) ** 2) /
        (Date.now() - record.time);
      let isFlick = speed > 2.5;
      if (isFlick) {
        element.dispatchEvent(new CustomEvent('flick', {
          detail: {
            startX: context.startX,
            startY: context.startY,
            clientX: point.clientX,
            clientY: point.clientY,
            speed,
          }
        }));
        console.log('flick');
      } else {
        console.log('pan end');
      }
      element.dispatchEvent(new CustomEvent('panEnd', {
        detail: {
          startX: context.startX,
          startY: context.startY,
          clientX: point.clientX,
          clientY: point.clientY,
          speed,
          isFlick: isFlick
        }
      }));
    }
    if (context.isTap) console.log("tap end");
    if (context.isPress) console.log("press end");

    clearTimeout(context.timeoutHandler);

    // console.log('end', point.clientX, point.clientY);
  };
  let cancel = (point, context) => {
    console.log("cancel");
    clearTimeout(context.timeoutHandler);
  };
}