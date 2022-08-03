// import React from 'react';
// import ReactDOM from 'react-dom';

import React from './myReact';
// import React from './myReactDemo';
const ReactDOM = React

const CustomReactApp =
  (
    <div>
      <h1 id="title">Title</h1>
      <a href="xxx">Jump</a>
      <section>
        <p>
          Article
        </p>
      </section>
    </div>
  );

function CustomReactAppFunc(props) {
  return (
    <div>
      <h1 id="title">{props.title}</h1>
      <hr></hr>
      <section>
        <h2>函数组件1</h2>
        <hr></hr>
        <h2>Class组件</h2>
        <hr></hr>
        {CustomReactApp}
      </section>
    </div>
  );
}

console.log('CustomReactApp', CustomReactApp);
console.log('CustomReactAppFunc', <CustomReactAppFunc title="Fiber Demo" />);

// ReactDOM.render(CustomReactApp, document.getElementById('root'));
ReactDOM.render(<CustomReactAppFunc title="Fiber Demo" />, document.getElementById('root'));

export { CustomReactApp, CustomReactAppFunc }

