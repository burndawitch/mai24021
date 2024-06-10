import React, { useState, useEffect, useCallback } from "react";
import { web3, contract } from "./web3";
import "./App.css";

const professorAddress = "0x153dfef4355E823dCB0FCc76Efe942BefCa86477";
const expectedNetworkId = 11155111; // Sepolia network ID

function App() {
  const [account, setAccount] = useState("");
  const [contractOwner, setContractOwner] = useState("");
  const [proposals, setProposals] = useState([]);
  const [proposalVotes, setProposalVotes] = useState([]);
  const [winner, setWinner] = useState("");
  const [votingHistory, setVotingHistory] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [votingEnded, setVotingEnded] = useState(false);
  const [endVotingClicked, setEndVotingClicked] = useState(false);
  const [metamaskInstalled, setMetamaskInstalled] = useState(false);
  const [metamaskConnected, setMetamaskConnected] = useState(false);
  const [correctNetwork, setCorrectNetwork] = useState(false);
  const [remainingVotes, setRemainingVotes] = useState(5);

  const loadBlockchainData = useCallback(async () => {
    try {
      const accounts = await web3.eth.getAccounts();
      if (accounts.length === 0) {
        setMetamaskConnected(false);
        alert("Please connect Metamask to this application.");
        return;
      }
      setAccount(accounts[0]);

      const owner = await contract.methods.owner().call();
      setContractOwner(owner);
      setIsOwner(accounts[0] === owner || accounts[0] === professorAddress);

      const proposals = await contract.methods.getProposals().call();
      setProposals(proposals);

      const votes = await contract.methods.getProposalVotes().call();
      const parsedVotes = votes.map(vote => parseInt(vote, 10));
      setProposalVotes(parsedVotes);

      const winner = await contract.methods.getWinner().call();
      setWinner(winner || "");

      const votingEnded = await contract.methods.votingEnded().call();
      setVotingEnded(votingEnded);

      // Update remaining votes
      const voteCount = await contract.methods.voterVoteCount(accounts[0]).call();
      setRemainingVotes(5 - parseInt(voteCount, 10));

      const networkId = await web3.eth.net.getId();
      const parsedNetworkId = parseInt(networkId, 10);
      const parsedExpectedNetworkId = parseInt(expectedNetworkId, 10);

      console.log("Detected network ID:", parsedNetworkId);
      console.log("Expected network ID:", parsedExpectedNetworkId);

      if (parsedNetworkId === parsedExpectedNetworkId) {
        console.log("Network is correct");
        setCorrectNetwork(true);
      } else {
        console.log("Network is incorrect");
        setCorrectNetwork(false);
        alert("Please connect to the Sepolia Ethereum network.");
      }

      // Listen for VoteCast events
      contract.events.VoteCast({}, (error, event) => {
        if (error) {
          console.error("Error on event", error);
        } else {
          alert(`New vote cast on proposal index: ${event.returnValues.proposalIndex}`);
          loadBlockchainData();
        }
      });

      // Listen for WinnerDeclared events
      contract.events.WinnerDeclared({}, (error, event) => {
        if (error) {
          console.error("Error on event", error);
        } else {
          alert(`The winner is: ${event.returnValues.winnerName}`);
          loadBlockchainData();
        }
      });

    } catch (error) {
      console.error("Error loading blockchain data:", error);
    }
  }, []);

  const checkMetamaskConnection = useCallback(async () => {
    if (window.ethereum) {
      setMetamaskInstalled(true);
      const accounts = await web3.eth.getAccounts();
      if (accounts.length === 0) {
        setMetamaskConnected(false);
        alert("Please connect Metamask to this application.");
      } else {
        setMetamaskConnected(true);

        const networkId = await web3.eth.net.getId();
        const parsedNetworkId = parseInt(networkId, 10);
        const parsedExpectedNetworkId = parseInt(expectedNetworkId, 10);

        console.log("Detected network ID:", parsedNetworkId);
        console.log("Expected network ID:", parsedExpectedNetworkId);

        if (parsedNetworkId === parsedExpectedNetworkId) {
          console.log("Network is correct");
          setCorrectNetwork(true);
          await loadBlockchainData();
        } else {
          console.log("Network is incorrect");
          setCorrectNetwork(false);
          alert("Please connect to the Sepolia Ethereum network.");
        }
      }
    } else {
      setMetamaskInstalled(false);
      alert("Please install Metamask to use this DApp.");
    }
  }, [loadBlockchainData]);

  const checkAccountChange = useCallback(async () => {
    const accounts = await web3.eth.getAccounts();
    if (accounts[0] !== account) {
      setAccount(accounts[0]);
      await loadBlockchainData();
    }
  }, [account, loadBlockchainData]);

  useEffect(() => {
    checkMetamaskConnection();
    const accountChangeInterval = setInterval(checkAccountChange, 1000);
    return () => clearInterval(accountChangeInterval);
  }, [checkAccountChange, checkMetamaskConnection]);

  const vote = async (index) => {
    try {
      await contract.methods.vote(index).send({ from: account, value: web3.utils.toWei("0.01", "ether") });
      alert(`Vote cast successfully for ${proposals[index]}!`);
      await loadBlockchainData();
    } catch (error) {
      console.error("Error casting vote:", error);
      alert("Error casting vote.");
    }
  };

  const endVoting = async () => {
    try {
      await contract.methods.endVoting().send({ from: account });
      alert("Voting ended successfully!");
      setEndVotingClicked(true);
      loadBlockchainData();
    } catch (error) {
      console.error("Error ending voting:", error);
      alert("Error ending voting.");
    }
  };

  const declareWinner = async () => {
    try {
      await contract.methods.declareWinner().send({ from: account });
      const winner = await contract.methods.getWinner().call();
      setWinner(winner);
      alert(`The winner is: ${winner}`);
      loadBlockchainData();
    } catch (error) {
      console.error("Error declaring winner:", error);
      alert("Error declaring winner.");
    }
  };

  const resetVoting = async () => {
    try {
      await contract.methods.resetVoting().send({ from: account });
      alert("Voting reset successfully!");
      setEndVotingClicked(false);
      setWinner("");
      loadBlockchainData();
    } catch (error) {
      console.error("Error resetting voting:", error);
      alert("Error resetting voting.");
    }
  };

  const withdraw = async () => {
    try {
      await contract.methods.withdraw().send({ from: account });
      alert("Funds withdrawn successfully!");
      loadBlockchainData();
    } catch (error) {
      console.error("Error withdrawing funds:", error);
      alert("Error withdrawing funds.");
    }
  };

  const transferOwnership = async (newOwner) => {
    try {
      await contract.methods.transferOwnership(newOwner).send({ from: account });
      alert("Ownership transferred successfully!");
      loadBlockchainData();
      window.location.reload();
    } catch (error) {
      console.error("Error transferring ownership:", error);
      alert("Error transferring ownership.");
    }
  };

  const destroyContract = async () => {
    try {
      await contract.methods.destroy().send({ from: account });
      alert("Contract destroyed successfully!");
      loadBlockchainData();
    } catch (error) {
      console.error("Error destroying contract:", error);
      alert("Error destroying contract.");
    }
  };

  const getVotingHistory = async () => {
    try {
      const history = await contract.methods.getVotingHistory().call();
      const latestHistory = history.slice(-10).reverse();
      const parsedHistory = latestHistory.map(hist => ({
        ...hist,
        round: parseInt(hist.round, 10),
        voteCount: parseInt(hist.voteCount, 10)
      }));
      setVotingHistory(parsedHistory);
      alert("Voting history fetched successfully!");
    } catch (error) {
      console.error("Error fetching voting history:", error);
      alert("Error fetching voting history.");
    }
  };

  const renderMetamaskStatus = () => {
    if (!metamaskInstalled) {
      return <p>Please install Metamask to use this DApp.</p>;
    }
    if (!metamaskConnected) {
      return <p>Please connect Metamask to this application.</p>;
    }
    if (!correctNetwork) {
      return <p>Please connect to the Sepolia Ethereum network.</p>;
    }
    return <p>Metamask is installed, connected, and on the correct network.</p>;
  };

  return (
    <div className="App">
      <h1>Voting DApp</h1>
      {renderMetamaskStatus()}
      <p>Account: {account}</p>
      <p>Contract Owner: {contractOwner}</p>

      <div className="main-content">
        <h2 className="proposals-title">Proposals</h2>
        <div className="proposals-container">
          <div className="proposals">
            {proposals.map((proposal, index) => {
              const imgPath = `https://burndawitch.github.io/mai24021/${proposal}.jpg`;
              console.log("Image Path:", imgPath);
              return (
                <div key={index} className="proposal">
                  <img src={imgPath} alt={proposal} onError={(e) => console.error("Image load error:", e)} />
                  <div className={winner === proposal ? 'winner' : ''}>{proposal}</div>
                  <button onClick={() => vote(index)} disabled={votingEnded || isOwner || remainingVotes === 0}>
                    Vote
                  </button>
                  <div>Votes: {proposalVotes[index] !== undefined ? proposalVotes[index] : 0}</div>
                  <div>Remaining Votes: {remainingVotes}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="actions">
          <button onClick={endVoting} disabled={!isOwner || votingEnded || endVotingClicked}>End Voting</button>
          <button onClick={declareWinner} disabled={!isOwner || !votingEnded}>Declare Winner</button>
          <button onClick={resetVoting} disabled={!isOwner}>Reset Voting</button>
          <button onClick={withdraw} disabled={!isOwner}>Withdraw</button>
          <button onClick={() => transferOwnership(prompt("Enter new owner address:"))} disabled={!isOwner}>Transfer Ownership</button>
          <button onClick={destroyContract} disabled={!isOwner}>Destroy Contract</button>
          <button onClick={getVotingHistory}>Get Voting History</button>
        </div>

        <h2>Winner: {winner}</h2>
        <div className="history">
          <h3>Voting History</h3>
          {votingHistory.map((history, index) => (
            <div key={index}>Round {history.round}: {history.winnerName} with {history.voteCount} votes</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
